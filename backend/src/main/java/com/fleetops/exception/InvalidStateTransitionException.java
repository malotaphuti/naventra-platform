package com.fleetops.exception;

public class InvalidStateTransitionException extends RuntimeException {

    private final String entityType;
    private final String currentState;
    private final String targetState;

    public InvalidStateTransitionException(String entityType, String currentState, String targetState) {
        super(String.format("Invalid state transition for %s: cannot transition from '%s' to '%s'",
                entityType, currentState, targetState));
        this.entityType = entityType;
        this.currentState = currentState;
        this.targetState = targetState;
    }

    public String getEntityType() {
        return entityType;
    }

    public String getCurrentState() {
        return currentState;
    }

    public String getTargetState() {
        return targetState;
    }
}
