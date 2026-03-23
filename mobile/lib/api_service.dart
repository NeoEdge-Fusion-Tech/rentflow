import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Use 10.0.2.2 for Android emulator to hit localhost
  // If running on physical device, replace with your local IP like 'http://192.168.1.X:8000/api'
  static const String baseUrl = 'http://127.0.0.1:8000/api';
  static const _storage = FlutterSecureStorage();

  static Future<bool> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/users/token/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['access'] != null) {
          await _storage.write(key: 'jwt_token', value: data['access']);
          return true;
        }
      }
      return false;
    } catch (e) {
      print('Login error: $e');
      return false;
    }
  }

  static Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  static Future<Map<String, dynamic>> scanItem(
    String serialNumber, 
    String action, {
    int? quantity, 
    int? qtyGood, 
    int? qtyDamaged, 
    String? condition, 
    bool? conditionSubmitted
  }) async {
    try {
      final token = await getToken();
      if (token == null) return {'error': 'Authentication required'};

      final Map<String, dynamic> body = {
        'serial_number': serialNumber,
        'action': action,
      };
      if (quantity != null) body['quantity'] = quantity;
      if (qtyGood != null) body['qty_good'] = qtyGood;
      if (qtyDamaged != null) body['qty_damaged'] = qtyDamaged;
      if (condition != null) body['condition'] = condition;
      if (conditionSubmitted != null) body['condition_submitted'] = conditionSubmitted;

      final response = await http.post(
        Uri.parse('$baseUrl/inventory/scan/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      );

      final data = jsonDecode(response.body);
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        data['success'] = true;
        return data as Map<String, dynamic>;
      } else {
        data['success'] = false;
        return data as Map<String, dynamic>;
      }
    } catch (e) {
      print('Scan error: $e');
      return {'success': false, 'error': 'Network error occurred'};
    }
  }
}
