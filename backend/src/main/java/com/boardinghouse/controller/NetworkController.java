package com.boardinghouse.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.*;
import java.util.*;

@RestController
@RequestMapping("/network")
@CrossOrigin(origins = "*")
public class NetworkController {

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getNetworkInfo(
            @RequestHeader(value = "Host", required = false) String hostHeader) {

        Map<String, Object> result = new LinkedHashMap<>();
        String lanIp = findLanIp();
        int backendPort = parsePort(hostHeader, 8080);

        result.put("lanIp", lanIp);
        result.put("backendPort", backendPort);
        result.put("backendUrl", "http://" + lanIp + ":" + backendPort);

        return ResponseEntity.ok(result);
    }

    private String findLanIp() {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            // Prefer wireless/Wi-Fi interfaces
            List<String> candidates = new ArrayList<>();
            while (interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                if (ni.isLoopback() || !ni.isUp()) continue;

                for (InterfaceAddress addr : ni.getInterfaceAddresses()) {
                    InetAddress inet = addr.getAddress();
                    if (inet instanceof Inet4Address && !inet.isLoopbackAddress()) {
                        String ip = inet.getHostAddress();
                        String name = ni.getDisplayName().toLowerCase();
                        // Prioritize Wi-Fi / Wireless / common LAN adapters
                        if (name.contains("wi-fi") || name.contains("wlan") || name.contains("wireless")) {
                            return ip; // Best match
                        }
                        if (ip.startsWith("192.168.") || ip.startsWith("10.")) {
                            candidates.add(0, ip); // Prefer private ranges
                        } else {
                            candidates.add(ip);
                        }
                    }
                }
            }
            if (!candidates.isEmpty()) return candidates.get(0);
        } catch (SocketException e) {
            // fallback
        }
        return "127.0.0.1";
    }

    private int parsePort(String hostHeader, int defaultPort) {
        if (hostHeader != null && hostHeader.contains(":")) {
            try {
                return Integer.parseInt(hostHeader.split(":")[1].trim());
            } catch (NumberFormatException ignored) {}
        }
        return defaultPort;
    }
}
