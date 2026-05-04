package com.boardinghouse.service;

import com.boardinghouse.dto.RoomPhotoDto;
import com.boardinghouse.entity.Room;
import com.boardinghouse.entity.RoomPhoto;
import com.boardinghouse.exception.ResourceNotFoundException;
import com.boardinghouse.repository.RoomPhotoRepository;
import com.boardinghouse.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class RoomPhotoService {

    private final RoomPhotoRepository photoRepo;
    private final RoomRepository roomRepo;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    public RoomPhotoService(RoomPhotoRepository photoRepo, RoomRepository roomRepo) {
        this.photoRepo = photoRepo;
        this.roomRepo = roomRepo;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public List<RoomPhotoDto> getByRoom(Long roomId) {
        return photoRepo.findByRoomIdOrderBySortOrderAscUploadedAtAsc(roomId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<RoomPhotoDto> getByBoardingHouse(Long bhId) {
        return photoRepo.findByBoardingHouseId(bhId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Upload ────────────────────────────────────────────────────────────────

    public RoomPhotoDto upload(Long roomId, MultipartFile file, String caption, boolean setPrimary) throws IOException {
        Room room = roomRepo.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + roomId));

        // Validate type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }

        // Save file under uploads/rooms/{roomId}/
        String ext = getExtension(file.getOriginalFilename());
        String filename = "photo_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12) + ext;
        String relativePath = "rooms/" + roomId + "/" + filename;
        Path targetPath = Paths.get(uploadDir, "rooms", String.valueOf(roomId), filename);
        Files.createDirectories(targetPath.getParent());
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        // Build entity
        RoomPhoto photo = new RoomPhoto();
        photo.setRoom(room);
        photo.setFilePath(relativePath);
        photo.setOriginalName(file.getOriginalFilename());
        photo.setCaption(caption);
        photo.setSortOrder((int) photoRepo.countByRoomId(roomId));
        photo.setIsPrimary(false);

        RoomPhoto saved = photoRepo.save(photo);

        // If requested as primary (or it's the first photo), mark it
        if (setPrimary || photoRepo.countByRoomId(roomId) == 1) {
            markAsPrimary(saved.getId(), roomId);
        }

        return toDto(saved);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public RoomPhotoDto update(Long id, String caption, Integer sortOrder) {
        RoomPhoto photo = photoRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found: " + id));
        if (caption != null) photo.setCaption(caption);
        if (sortOrder != null) photo.setSortOrder(sortOrder);
        return toDto(photoRepo.save(photo));
    }

    public void markAsPrimary(Long photoId, Long roomId) {
        // Unset all primaries for this room
        photoRepo.findByRoomIdOrderBySortOrderAscUploadedAtAsc(roomId)
                .forEach(p -> { p.setIsPrimary(false); photoRepo.save(p); });
        // Set the target
        RoomPhoto photo = photoRepo.findById(photoId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found: " + photoId));
        photo.setIsPrimary(true);
        photoRepo.save(photo);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    public void delete(Long id) {
        RoomPhoto photo = photoRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found: " + id));
        // Delete physical file
        try {
            Path filePath = Paths.get(uploadDir, photo.getFilePath());
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Log but don't fail the whole operation
        }
        photoRepo.deleteById(id);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return ".jpg";
        return filename.substring(filename.lastIndexOf('.'));
    }

    private RoomPhotoDto toDto(RoomPhoto p) {
        RoomPhotoDto dto = new RoomPhotoDto();
        dto.setId(p.getId());
        dto.setFilePath(p.getFilePath());
        dto.setUrl(baseUrl + "/api/uploads/" + p.getFilePath());
        dto.setOriginalName(p.getOriginalName());
        dto.setCaption(p.getCaption());
        dto.setSortOrder(p.getSortOrder());
        dto.setIsPrimary(p.getIsPrimary());
        dto.setUploadedAt(p.getUploadedAt());
        if (p.getRoom() != null) {
            dto.setRoomId(p.getRoom().getId());
            dto.setRoomCode(p.getRoom().getCode());
            if (p.getRoom().getBoardingHouse() != null) {
                dto.setBoardingHouseId(p.getRoom().getBoardingHouse().getId());
            }
        }
        return dto;
    }
}
