package com.boardinghouse.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.mvc.WebContentInterceptor;

import java.util.concurrent.TimeUnit;

@Configuration
public class HttpCacheConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Cache boarding-houses, service-types for 2 minutes on client side
        WebContentInterceptor cacheInterceptor = new WebContentInterceptor();
        cacheInterceptor.addCacheMapping(
                CacheControl.maxAge(2, TimeUnit.MINUTES).cachePublic(),
                "/api/boarding-houses",
                "/api/service-types",
                "/api/service-catalog/**"
        );
        registry.addInterceptor(cacheInterceptor);
    }
}
