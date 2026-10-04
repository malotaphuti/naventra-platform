package com.fleetops.config;

import com.fleetops.service.AuditService;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.util.Map;

/** Captures the id of a newly created resource so the audit row for a POST can reference it. */
@ControllerAdvice
public class AuditResponseAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        try {
            if (body != null && HttpMethod.POST.equals(request.getMethod())
                    && request instanceof ServletServerHttpRequest servletRequest) {
                Object id = null;
                if (body instanceof Map<?, ?> map) {
                    id = map.get("id");
                } else if (!(body instanceof CharSequence)) {
                    BeanWrapperImpl wrapper = new BeanWrapperImpl(body);
                    if (wrapper.isReadableProperty("id")) id = wrapper.getPropertyValue("id");
                }
                if (id instanceof Number n) {
                    servletRequest.getServletRequest().setAttribute(AuditService.ATTR_ENTITY_ID, n.longValue());
                }
            }
        } catch (Exception ignored) {
            // auditing must never affect the response
        }
        return body;
    }
}
