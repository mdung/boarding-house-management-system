package com.boardinghouse.controller;

import com.boardinghouse.dto.RoomPhotoDto;
import com.boardinghouse.service.RoomPhotoService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class RoomPhotoController {

    private final RoomPhotoService service;

    public RoomPhotoController(RoomPhotoService service) {
        this.service = service;
    }

    // ── Photos by Room ────────────────────────────────────────────────────────
    /** GET /rooms/:roomId/photos */
    @GetMapping("/rooms/{roomId}/photos")
    public ResponseEntity<List<RoomPhotoDto>> getByRoom(@PathVariable Long roomId) {
        return ResponseEntity.ok(service.getByRoom(roomId));
    }

    /** POST /rooms/:roomId/photos — multipart upload */
    @PostMapping("/rooms/{roomId}/photos")
    public ResponseEntity<RoomPhotoDto> upload(
            @PathVariable Long roomId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "setPrimary", defaultValue = "false") boolean setPrimary) throws IOException {
        return new ResponseEntity<>(service.upload(roomId, file, caption, setPrimary), HttpStatus.CREATED);
    }

    // ── Photos by Boarding House ──────────────────────────────────────────────
    /** GET /room-photos?boardingHouseId=X */
    @GetMapping("/room-photos")
    public ResponseEntity<List<RoomPhotoDto>> getByBoardingHouse(@RequestParam Long boardingHouseId) {
        return ResponseEntity.ok(service.getByBoardingHouse(boardingHouseId));
    }

    // ── Update / Delete / Primary ─────────────────────────────────────────────
    /** PUT /room-photos/:id */
    @PutMapping("/room-photos/{id}")
    public ResponseEntity<RoomPhotoDto> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String caption = (String) body.get("caption");
        Integer sortOrder = body.get("sortOrder") != null ? ((Number) body.get("sortOrder")).intValue() : null;
        return ResponseEntity.ok(service.update(id, caption, sortOrder));
    }

    /** PATCH /room-photos/:id/primary?roomId=X */
    @PatchMapping("/room-photos/{id}/primary")
    public ResponseEntity<Void> markAsPrimary(@PathVariable Long id, @RequestParam Long roomId) {
        service.markAsPrimary(id, roomId);
        return ResponseEntity.ok().build();
    }

    /** DELETE /room-photos/:id */
    @DeleteMapping("/room-photos/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Serve uploaded files ──────────────────────────────────────────────────
    /**
     * GET /api/uploads/rooms/{roomId}/{filename}
     * Serves the actual image files from the uploads directory.
     */
    @GetMapping("/uploads/rooms/{roomId}/{filename:.+}")
    public ResponseEntity<Resource> serveFile(
            @PathVariable String roomId,
            @PathVariable String filename) throws IOException {
        Path filePath = Paths.get("uploads", "rooms", roomId, filename);
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }
        String contentType = "image/jpeg";
        if (filename.toLowerCase().endsWith(".png")) contentType = "image/png";
        else if (filename.toLowerCase().endsWith(".webp")) contentType = "image/webp";
        else if (filename.toLowerCase().endsWith(".gif")) contentType = "image/gif";
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType)).body(resource);
    }
}
