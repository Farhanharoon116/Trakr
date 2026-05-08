import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app.dart';
import 'core/offline/offline_db.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Hive offline storage
  await Hive.initFlutter();
  await OfflineDatabase.init();

  // Supabase
  await Supabase.initialize(
    url: const String.fromEnvironment('SUPABASE_URL'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
  );

  // Firebase (push notifications)
  await Firebase.initializeApp();

  runApp(
    const ProviderScope(
      child: BizOSApp(),
    ),
  );
}
