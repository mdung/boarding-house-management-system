package com.boardinghouse.dto;

import lombok.Data;

import java.util.List;

@Data
public class UserProfileDto {
    private Long id;
    private String username;
    private String fullName;
    private String phone;
    private String email;
    private List<String> roles;
}

