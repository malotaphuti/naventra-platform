FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Cache the Maven repository between builds so dependencies aren't re-downloaded every time;
# retry interrupted downloads instead of failing the build
RUN --mount=type=cache,target=/root/.m2 mvn -B -q clean package -DskipTests \
    -Daether.connector.http.retryHandler.count=5 -Dmaven.wagon.http.retryHandler.count=5

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

RUN addgroup -S fleetops && adduser -S fleetops -G fleetops \
    && mkdir -p /app/uploads && chown fleetops:fleetops /app/uploads
USER fleetops

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
