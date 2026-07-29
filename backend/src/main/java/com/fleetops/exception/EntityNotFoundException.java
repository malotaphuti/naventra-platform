package com.fleetops.exception;

public class EntityNotFoundException extends RuntimeException {

    private final String entityType;
    private final Object entityId;

    public EntityNotFoundException(String entityType, Object entityId) {
        super(String.format("%s with id '%s' not found", entityType, entityId));
        this.entityType = entityType;
        this.entityId = entityId;
    }

    public String getEntityType() {
        return entityType;
    }

    public Object getEntityId() {
        return entityId;
    }
}
