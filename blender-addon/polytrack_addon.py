bl_info = {
    "name": "PolyTrack 3D Studio Production Tracking",
    "author": "PolyTrack Studio Monolith",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Sidebar (N-Panel) > PolyTrack",
    "description": "Browse, download, inspect, and publish 3D assets directly to the PolyTrack studio server",
    "category": "3D View",
}

import bpy
import json
import urllib.request
import urllib.parse
import os
import tempfile
import uuid
import mimetypes

# ── Global Addon Properties ───────────────────────────────────

class PolyTrackProperties(bpy.types.PropertyGroup):
    api_url: bpy.props.StringProperty(
        name="API Base URL",
        description="Base URL of the PolyTrack backend REST API",
        default="http://localhost:5030/api"
    )
    email: bpy.props.StringProperty(
        name="Email",
        description="Studio User Email",
        default="artist@polytrack.com"
    )
    password: bpy.props.StringProperty(
        name="Password",
        description="Studio User Password",
        default="Admin@123456",
        subtype='PASSWORD'
    )
    auth_token: bpy.props.StringProperty(
        name="Token",
        description="JWT Authentication Token",
        default=""
    )
    user_name: bpy.props.StringProperty(
        name="User",
        default=""
    )
    user_role: bpy.props.StringProperty(
        name="Role",
        default=""
    )
    is_authenticated: bpy.props.BoolProperty(
        name="Authenticated",
        default=False
    )
    search_query: bpy.props.StringProperty(
        name="Search",
        description="Search asset name or tag",
        default=""
    )
    category_filter: bpy.props.EnumProperty(
        name="Category",
        description="Filter assets by category",
        items=[
            ("ALL", "All Categories", "All asset categories"),
            ("Prop", "Prop", "Props & objects"),
            ("Character", "Character", "Characters & rigs"),
            ("Environment", "Environment", "Environments & architecture"),
            ("Texture", "Texture", "Textures & PBR materials"),
            ("Animation", "Animation", "Animation tracks"),
            ("Vfx", "VFX", "Visual effects"),
        ],
        default="ALL"
    )
    active_asset_id: bpy.props.StringProperty(
        name="Asset ID",
        default=""
    )
    version_notes: bpy.props.StringProperty(
        name="Notes",
        description="Notes for the published version",
        default="Published from Blender"
    )
    status_message: bpy.props.StringProperty(
        name="Status",
        default="Ready"
    )

# ── API Helper Functions ──────────────────────────────────────

def make_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    if data and isinstance(data, dict):
        data_bytes = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif data and isinstance(data, (bytes, bytearray)):
        data_bytes = data
    else:
        data_bytes = None

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = response.read()
            content_type = response.headers.get("Content-Type", "")
            if "application/json" in content_type:
                return json.loads(res_data.decode("utf-8")), None
            return res_data, None
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8")
            return None, f"HTTP {e.code}: {err_body}"
        except:
            return None, f"HTTP Error {e.code}"
    except Exception as e:
        return None, str(e)

def upload_multipart(url, token, file_path, fields):
    boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
    crlf = b"\r\n"
    body = bytearray()

    for key, value in fields.items():
        if value is None:
            continue
        body.extend(f"--{boundary}".encode("utf-8") + crlf)
        body.extend(f'Content-Disposition: form-data; name="{key}"'.encode("utf-8") + crlf + crlf)
        body.extend(str(value).encode("utf-8") + crlf)

    filename = os.path.basename(file_path)
    mime_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"

    body.extend(f"--{boundary}".encode("utf-8") + crlf)
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode("utf-8") + crlf)
    body.extend(f"Content-Type: {mime_type}".encode("utf-8") + crlf + crlf)

    with open(file_path, "rb") as f:
        body.extend(f.read())
    body.extend(crlf)

    body.extend(f"--{boundary}--".encode("utf-8") + crlf)

    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Authorization": f"Bearer {token}",
        "Content-Length": str(len(body))
    }

    req = urllib.request.Request(url, data=bytes(body), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.loads(response.read().decode("utf-8")), None
    except urllib.error.HTTPError as e:
        return None, f"Upload error {e.code}: {e.read().decode('utf-8')}"
    except Exception as e:
        return None, str(e)

# ── Dynamic Asset Item Property ───────────────────────────────

class PolyTrackAssetItem(bpy.types.PropertyGroup):
    asset_id: bpy.props.StringProperty()
    name: bpy.props.StringProperty()
    category: bpy.props.StringProperty()
    status: bpy.props.StringProperty()
    version_count: bpy.props.IntProperty()
    current_version_id: bpy.props.StringProperty()
    current_version_file: bpy.props.StringProperty()
    project_id: bpy.props.StringProperty()

# ── Operators ─────────────────────────────────────────────────

class POLYTRACK_OT_Login(bpy.types.Operator):
    bl_idname = "polytrack.login"
    bl_label = "Log In"
    bl_description = "Authenticate with the PolyTrack REST API"

    demo_email: bpy.props.StringProperty(default="")
    demo_role: bpy.props.StringProperty(default="")

    def execute(self, context):
        props = context.scene.polytrack_props
        email = self.demo_email if self.demo_email else props.email
        password = "Admin@123456" if self.demo_email else props.password

        url = f"{props.api_url.rstrip('/')}/auth/login"
        payload = {"email": email, "password": password}

        data, err = make_request(url, method="POST", data=payload)
        if err:
            self.report({'ERROR'}, f"Login failed: {err}")
            props.status_message = f"Login failed: {err}"
            return {'CANCELLED'}

        props.auth_token = data.get("accessToken", "")
        user = data.get("user", {})
        props.user_name = user.get("name", "User")
        props.user_role = user.get("role", "Artist")
        props.email = email
        props.is_authenticated = True
        props.status_message = f"Connected as {props.user_name} ({props.user_role})"

        self.report({'INFO'}, f"Logged in as {props.user_name} ({props.user_role})")
        bpy.ops.polytrack.search_assets()
        return {'FINISHED'}

class POLYTRACK_OT_Logout(bpy.types.Operator):
    bl_idname = "polytrack.logout"
    bl_label = "Log Out"

    def execute(self, context):
        props = context.scene.polytrack_props
        props.auth_token = ""
        props.user_name = ""
        props.user_role = ""
        props.is_authenticated = False
        props.status_message = "Logged out"
        context.scene.polytrack_assets.clear()
        self.report({'INFO'}, "Logged out from PolyTrack")
        return {'FINISHED'}

class POLYTRACK_OT_SearchAssets(bpy.types.Operator):
    bl_idname = "polytrack.search_assets"
    bl_label = "Search Assets"
    bl_description = "Search assets on PolyTrack Studio Server"

    def execute(self, context):
        props = context.scene.polytrack_props
        if not props.auth_token:
            self.report({'WARNING'}, "Please log in first")
            return {'CANCELLED'}

        params = {}
        if props.search_query:
            params["query"] = props.search_query
        if props.category_filter != "ALL":
            params["category"] = props.category_filter

        query_str = urllib.parse.urlencode(params)
        url = f"{props.api_url.rstrip('/')}/assets/search?{query_str}"
        headers = {"Authorization": f"Bearer {props.auth_token}"}

        data, err = make_request(url, method="GET", headers=headers)
        if err:
            self.report({'ERROR'}, f"Search failed: {err}")
            props.status_message = f"Error: {err}"
            return {'CANCELLED'}

        assets_list = context.scene.polytrack_assets
        assets_list.clear()

        raw_items = data.get("data", [])
        for item in raw_items:
            entry = assets_list.add()
            entry.asset_id = str(item.get("id", ""))
            entry.name = str(item.get("name", "Unnamed Asset"))
            entry.category = str(item.get("category", "Prop"))
            entry.status = str(item.get("status", "Draft"))
            entry.version_count = int(item.get("versionCount", 1))
            entry.current_version_file = str(item.get("currentVersionFile", "") or "")
            entry.project_id = str(item.get("projectId", ""))

        props.status_message = f"Found {len(raw_items)} asset(s)"
        return {'FINISHED'}

class POLYTRACK_OT_DownloadAsset(bpy.types.Operator):
    bl_idname = "polytrack.download_asset"
    bl_label = "Download / Import Asset"
    bl_description = "Download 3D asset from PolyTrack storage and import into scene"

    asset_id: bpy.props.StringProperty()
    asset_name: bpy.props.StringProperty()

    def execute(self, context):
        props = context.scene.polytrack_props
        if not props.auth_token:
            self.report({'WARNING'}, "Please log in first")
            return {'CANCELLED'}

        # Fetch asset detail to get version ID
        detail_url = f"{props.api_url.rstrip('/')}/assets/{self.asset_id}"
        headers = {"Authorization": f"Bearer {props.auth_token}"}
        detail, err = make_request(detail_url, headers=headers)
        if err or not detail:
            self.report({'ERROR'}, f"Could not fetch asset details: {err}")
            return {'CANCELLED'}

        versions = detail.get("versions", [])
        if not versions:
            self.report({'WARNING'}, "No versions found for this asset")
            return {'CANCELLED'}

        latest_version = versions[0]
        version_id = latest_version.get("id")
        file_name = latest_version.get("fileName", "asset.blend")

        download_url = f"{props.api_url.rstrip('/')}/assets/{self.asset_id}/download/{version_id}"
        file_bytes, d_err = make_request(download_url, headers=headers)
        if d_err or not file_bytes:
            self.report({'ERROR'}, f"Failed to download asset: {d_err}")
            return {'CANCELLED'}

        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, file_name)
        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        ext = os.path.splitext(file_name)[1].lower()
        try:
            if ext == ".blend":
                # Link or append objects from blend file
                with bpy.data.libraries.load(temp_path, link=False) as (data_from, data_to):
                    data_to.objects = data_from.objects
                for obj in data_to.objects:
                    if obj is not None:
                        context.collection.objects.link(obj)
                self.report({'INFO'}, f"Appended objects from {file_name}")
            elif ext == ".fbx":
                bpy.ops.import_scene.fbx(filepath=temp_path)
                self.report({'INFO'}, f"Imported FBX {file_name}")
            elif ext == ".obj":
                try:
                    bpy.ops.wm.obj_import(filepath=temp_path)
                except:
                    bpy.ops.import_scene.obj(filepath=temp_path)
                self.report({'INFO'}, f"Imported OBJ {file_name}")
            elif ext in [".glb", ".gltf"]:
                bpy.ops.import_scene.gltf(filepath=temp_path)
                self.report({'INFO'}, f"Imported GLTF/GLB {file_name}")
            else:
                self.report({'INFO'}, f"Downloaded {file_name} to {temp_path}")
        except Exception as ex:
            self.report({'WARNING'}, f"Downloaded file saved to: {temp_path} ({ex})")

        props.status_message = f"Downloaded {file_name}"
        return {'FINISHED'}

class POLYTRACK_OT_PublishVersion(bpy.types.Operator):
    bl_idname = "polytrack.publish_version"
    bl_label = "Publish Active Scene as Version"
    bl_description = "Export active scene/selected object and publish new version to PolyTrack"

    asset_id: bpy.props.StringProperty()

    def execute(self, context):
        props = context.scene.polytrack_props
        if not props.auth_token:
            self.report({'WARNING'}, "Please log in first")
            return {'CANCELLED'}

        asset_id = self.asset_id if self.asset_id else props.active_asset_id
        if not asset_id:
            self.report({'WARNING'}, "Select an asset to publish version to")
            return {'CANCELLED'}

        # Calculate scene stats
        poly_count = 0
        material_set = set()
        dim_x = 0.0
        dim_y = 0.0
        dim_z = 0.0

        mesh_objects = [obj for obj in context.scene.objects if obj.type == 'MESH']
        for obj in mesh_objects:
            if obj.data:
                poly_count += len(obj.data.polygons)
                for mat in obj.data.materials:
                    if mat:
                        material_set.add(mat.name)

        if context.active_object:
            dim_x = context.active_object.dimensions.x
            dim_y = context.active_object.dimensions.y
            dim_z = context.active_object.dimensions.z

        # Save to temporary .blend file
        temp_dir = tempfile.gettempdir()
        temp_blend = os.path.join(temp_dir, f"polytrack_export_{uuid.uuid4().hex[:8]}.blend")
        bpy.ops.wm.save_as_mainfile(filepath=temp_blend, copy=True)

        upload_url = f"{props.api_url.rstrip('/')}/assets/{asset_id}/upload"
        fields = {
            "notes": props.version_notes,
            "polygonCount": poly_count,
            "materialCount": len(material_set),
            "dimensionsX": round(dim_x, 2),
            "dimensionsY": round(dim_y, 2),
            "dimensionsZ": round(dim_z, 2),
        }

        data, err = upload_multipart(upload_url, props.auth_token, temp_blend, fields)
        try:
            os.remove(temp_blend)
        except:
            pass

        if err:
            self.report({'ERROR'}, f"Upload failed: {err}")
            props.status_message = f"Publish failed: {err}"
            return {'CANCELLED'}

        v_num = data.get("versionNumber", "?")
        self.report({'INFO'}, f"Published version V{v_num} successfully! ({poly_count:,} polys)")
        props.status_message = f"V{v_num} published! ({poly_count:,} polys)"
        bpy.ops.polytrack.search_assets()
        return {'FINISHED'}

# ── 3D Viewport UI Panel ──────────────────────────────────────

class VIEW3D_PT_polytrack_panel(bpy.types.Panel):
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'PolyTrack'
    bl_label = 'PolyTrack Studio'

    def draw(self, context):
        layout = self.layout
        props = context.scene.polytrack_props

        # Header box
        header = layout.box()
        row = header.row(align=True)
        row.label(text="PolyTrack 3D Monolith", icon='SCENE_DATA')
        if props.is_authenticated:
            row.label(text="● ONLINE", icon='CHECKMARK')
        else:
            row.label(text="○ OFFLINE", icon='RADIOBUT_OFF')

        # Connection / Auth Box
        box = layout.box()
        box.prop(props, "api_url", text="API URL")

        if not props.is_authenticated:
            box.prop(props, "email")
            box.prop(props, "password")
            box.operator("polytrack.login", text="Sign In", icon='USER')

            # Quick demo logins
            quick_box = layout.box()
            quick_box.label(text="1-Click Demo Logins:", icon='RESTRICT_SELECT_OFF')
            row = quick_box.row(align=True)
            op = row.operator("polytrack.login", text="Artist")
            op.demo_email = "artist@polytrack.com"
            op = row.operator("polytrack.login", text="Lead Admin")
            op.demo_email = "admin@polytrack.com"
            row = quick_box.row(align=True)
            op = row.operator("polytrack.login", text="Reviewer")
            op.demo_email = "reviewer@polytrack.com"
            op = row.operator("polytrack.login", text="PM")
            op.demo_email = "pm@polytrack.com"
            return

        # User info
        user_row = box.row()
        user_row.label(text=f"User: {props.user_name} ({props.user_role})", icon='SOLO_ON')
        user_row.operator("polytrack.logout", text="Log Out", icon='CANCEL')

        # Asset Browser Section
        asset_box = layout.box()
        asset_box.label(text="Studio 3D Asset Browser", icon='ASSET_MANAGER')
        row = asset_box.row(align=True)
        row.prop(props, "category_filter", text="")
        row.prop(props, "search_query", text="", icon='VIEWZOOM')
        asset_box.operator("polytrack.search_assets", text="Search / Refresh", icon='FILE_REFRESH')

        assets = context.scene.polytrack_assets
        if assets:
            col = asset_box.column(align=True)
            for item in assets:
                card = col.box()
                r1 = card.row()
                r1.label(text=item.name, icon='OBJECT_DATAMODE')
                status_icon = 'CHECKMARK' if item.status == "Approved" else 'TIME'
                r1.label(text=f"[{item.status}]", icon=status_icon)

                r2 = card.row(align=True)
                r2.label(text=f"{item.category} • V{item.version_count}")

                # Download / Import Operator
                op_d = r2.operator("polytrack.download_asset", text="Import", icon='IMPORT')
                op_d.asset_id = item.asset_id
                op_d.asset_name = item.name

                # Publish new version to this asset
                op_p = r2.operator("polytrack.publish_version", text="Publish V+", icon='EXPORT')
                op_p.asset_id = item.asset_id
        else:
            asset_box.label(text="No assets loaded. Click Refresh.", icon='INFO')

        # Publish Scene Section
        pub_box = layout.box()
        pub_box.label(text="Publish Active Scene", icon='EXPORT')
        pub_box.prop(props, "version_notes", text="Version Note")

        # Mesh stats preview
        poly_count = sum(len(o.data.polygons) for o in context.scene.objects if o.type == 'MESH' and o.data)
        pub_box.label(text=f"Scene Polycount: {poly_count:,} tris/quads", icon='MESH_DATA')

        pub_box.operator("polytrack.publish_version", text="Publish to Studio Server", icon='CLOUD_UPLOAD')

        # Footer Status
        if props.status_message:
            layout.label(text=props.status_message, icon='INFO')

# ── Registration ──────────────────────────────────────────────

classes = (
    PolyTrackProperties,
    PolyTrackAssetItem,
    POLYTRACK_OT_Login,
    POLYTRACK_OT_Logout,
    POLYTRACK_OT_SearchAssets,
    POLYTRACK_OT_DownloadAsset,
    POLYTRACK_OT_PublishVersion,
    VIEW3D_PT_polytrack_panel,
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.polytrack_props = bpy.props.PointerProperty(type=PolyTrackProperties)
    bpy.types.Scene.polytrack_assets = bpy.props.CollectionProperty(type=PolyTrackAssetItem)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
    del bpy.types.Scene.polytrack_props
    del bpy.types.Scene.polytrack_assets

if __name__ == "__main__":
    register()
