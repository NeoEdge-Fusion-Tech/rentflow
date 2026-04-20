import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/scanner_screen.dart';
import 'api_service.dart';

void main() {
  runApp(const NeoEventApp());
}

class NeoEventApp extends StatelessWidget {
  const NeoEventApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NeoEvent Rentals',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF001C3D)),
        useMaterial3: true,
      ),
      home: FutureBuilder<String?>(
        future: ApiService.getToken(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          if (snapshot.hasData && snapshot.data != null) {
            return const ScannerScreen();
          }
          return const LoginScreen();
        },
      ),
    );
  }
}
