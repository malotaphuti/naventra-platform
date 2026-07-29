package com.fleetops.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Token store that attempts Redis first, falls back to in-memory map.
 * This allows running the application without Redis for development/demo.
 */
@Slf4j
@Service
public class TokenStoreService {

    @Autowired(required = false)
    private RedisTemplate<String, String> redisTemplate;

    private final Map<String, String> inMemoryStore = new ConcurrentHashMap<>();

    public void storeToken(String key, String token, Duration ttl) {
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(key, token, ttl);
                return;
            }
        } catch (Exception e) {
            log.debug("Redis unavailable, using in-memory store: {}", e.getMessage());
        }
        inMemoryStore.put(key, token);
    }

    public String getToken(String key) {
        try {
            if (redisTemplate != null) {
                return redisTemplate.opsForValue().get(key);
            }
        } catch (Exception e) {
            log.debug("Redis unavailable, using in-memory store: {}", e.getMessage());
        }
        return inMemoryStore.get(key);
    }

    public void deleteToken(String key) {
        try {
            if (redisTemplate != null) {
                redisTemplate.delete(key);
                return;
            }
        } catch (Exception e) {
            log.debug("Redis unavailable, using in-memory store: {}", e.getMessage());
        }
        inMemoryStore.remove(key);
    }
}
