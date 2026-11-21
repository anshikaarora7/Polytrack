# Multi-stage production build for PolyTrack ASP.NET Core Web API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files first for optimal layer caching
COPY ["PolyTrackAPI.Core/PolyTrackAPI.Core.csproj", "PolyTrackAPI.Core/"]
COPY ["PolyTrackAPI.Infrastructure/PolyTrackAPI.Infrastructure.csproj", "PolyTrackAPI.Infrastructure/"]
COPY ["PolyTrackAPI/PolyTrackAPI.csproj", "PolyTrackAPI/"]

# Restore NuGet packages
RUN dotnet restore "PolyTrackAPI/PolyTrackAPI.csproj"

# Copy source code and build
COPY . .
WORKDIR "/src/PolyTrackAPI"
RUN dotnet build "PolyTrackAPI.csproj" -c Release -o /app/build

# Publish optimized binaries
FROM build AS publish
RUN dotnet publish "PolyTrackAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Lightweight final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Cloud runtime configuration
ENV ASPNETCORE_URLS=http://+:5030
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 5030
EXPOSE 8080

# Create persistence directories for local fallback
RUN mkdir -p /app/studio-storage /app/.aspnet-data-protection-keys

COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "PolyTrackAPI.dll"]
