import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

void main() {
  runApp(const BapuHandleApp());
}

class BapuHandleApp extends StatelessWidget {
  const BapuHandleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BAPU Handles',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _handleController = TextEditingController();
  final _passwordController = TextEditingController();
  final _storage = const FlutterSecureStorage();
  bool _isLoading = false;

  Future<void> _login() async {
    setState(() => _isLoading = true);
    final handle = _handleController.text.trim();
    final password = _passwordController.text.trim();

    if (handle.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter handle and app password')),
      );
      setState(() => _isLoading = false);
      return;
    }

    try {
      final response = await http.post(
        Uri.parse('http://10.0.2.2:3000/api/login'), // Use 10.0.2.2 for Android Emulator
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'handle': handle, 'password': password}),
      );

      if (response.statusCode != 200) {
        throw Exception(json.decode(response.body)['error']);
      }

      final data = json.decode(response.body);
      await _storage.write(key: 'handle', value: data['handle']);
      await _storage.write(key: 'password', value: password);
      await _storage.write(key: 'did', value: data['did']);

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const HandleManagerScreen()),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Login failed: ${e.toString()}')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('BAPU Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Login with your Bluesky Account', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            TextField(controller: _handleController, decoration: const InputDecoration(labelText: 'Handle (e.g. alice.bsky.social)', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _passwordController, decoration: const InputDecoration(labelText: 'App Password', border: OutlineInputBorder()), obscureText: true),
            const SizedBox(height: 20),
            _isLoading ? const CircularProgressIndicator() : ElevatedButton(onPressed: _login, child: const Text('Login')),
          ],
        ),
      ),
    );
  }
}

class HandleManagerScreen extends StatefulWidget {
  const HandleManagerScreen({super.key});
  @override
  State<HandleManagerScreen> createState() => _HandleManagerScreenState();
}

class _HandleManagerScreenState extends State<HandleManagerScreen> {
  final _storage = const FlutterSecureStorage();
  final _newHandleController = TextEditingController();
  String? _myHandle;
  String? _myPassword;
  List<String> _domains = [];
  String? _selectedDomain;
  bool _isChecking = false;
  bool? _isAvailable;
  String? _availabilityReason;
  bool _isOperationInProgress = false;
  List<Map<String, dynamic>> _myPreviousHandles = [];
  // Use 10.0.2.2 for Android Emulator, or your server's public IP
  final String _baseUrl = 'http://10.0.2.2:3000/api';

  @override
  void initState() {
    super.initState();
    _loadCredentials();
    _fetchDomains();
  }

  Future<void> _loadCredentials() async {
    final handle = await _storage.read(key: 'handle');
    final password = await _storage.read(key: 'password');
    setState(() {
      _myHandle = handle;
      _myPassword = password;
    });
    if (handle != null) _fetchMyHandles();
  }

  Future<void> _fetchMyHandles() async {
      final did = await _storage.read(key: 'did');
      if (did == null) return;
      try {
          final res = await http.get(Uri.parse('$_baseUrl/my-handles?did=$did'));
          if (res.statusCode == 200) {
              final data = json.decode(res.body);
              setState(() { _myPreviousHandles = List<Map<String, dynamic>>.from(data['handles']); });
          }
      } catch (e) { print('Error fetching my handles: $e'); }
  }

  Future<void> _fetchDomains() async {
    try {
      final response = await http.get(Uri.parse('$_baseUrl/domains'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _domains = List<String>.from(data['domains']);
          if (_domains.isNotEmpty) _selectedDomain = _domains.first;
        });
      }
    } catch (e) { print('Error fetching domains: $e'); }
  }

  Future<void> _checkAvailability() async {
    if (_newHandleController.text.isEmpty || _selectedDomain == null) return;
    setState(() { _isChecking = true; _isAvailable = null; });
    try {
      final response = await http.get(Uri.parse('$_baseUrl/check-handle?handle=${_newHandleController.text.trim()}&domain=$_selectedDomain'));
      final data = json.decode(response.body);
      setState(() { _isAvailable = data['available'] == true; _availabilityReason = data['reason']; });
    } catch (e) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally { setState(() => _isChecking = false); }
  }

  Future<void> _claimAndAutomate() async {
    if (_isAvailable != true) return;
    setState(() => _isOperationInProgress = true);
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/automate-all'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'currentHandle': _myHandle,
          'appPassword': _myPassword,
          'desiredHandle': _newHandleController.text.trim(),
          'domain': _selectedDomain,
        }),
      );
      if (response.statusCode != 200) throw Exception(json.decode(response.body)['error']);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Success! Your handle has been updated.')));
      _fetchMyHandles();
    } catch (e) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally { setState(() => _isOperationInProgress = false); }
  }

  Future<void> _revertToHandle(String handle) async {
    setState(() => _isOperationInProgress = true);
    try {
      final updateRes = await http.post(Uri.parse('$_baseUrl/update-handle'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({ 'currentHandle': _myHandle, 'appPassword': _myPassword, 'newHandle': handle }),
      );
      if (updateRes.statusCode != 200) throw Exception(json.decode(updateRes.body)['error']);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Handle switched to $handle')));
      setState(() { _myHandle = handle; });
      await _storage.write(key: 'handle', value: handle);
    } catch (e) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally { setState(() => _isOperationInProgress = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Manage Handle'), actions: [ IconButton(icon: const Icon(Icons.logout), onPressed: () async { await _storage.deleteAll(); if (!mounted) return; Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (context) => const LoginScreen())); }) ]),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Logged in as: $_myHandle', style: const TextStyle(fontWeight: FontWeight.bold)),
            const Divider(),
            const SizedBox(height: 20),
            const Text('Claim a new handle:', style: TextStyle(fontSize: 16)),
            Row(children: [
                Expanded(child: TextField(controller: _newHandleController, decoration: const InputDecoration(hintText: 'username'), onChanged: (_) => setState(() => _isAvailable = null))),
                const Text(' . '),
                DropdownButton<String>(value: _selectedDomain, items: _domains.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(), onChanged: (val) => setState(() { _selectedDomain = val; _isAvailable = null; })),
            ]),
            const SizedBox(height: 10),
            ElevatedButton(onPressed: _isChecking ? null : _checkAvailability, child: _isChecking ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Check Availability')),
            if (_isAvailable != null) ...[
              const SizedBox(height: 10),
              Text(_isAvailable! ? '✅ Available!' : '❌ Not Available: $_availabilityReason', style: TextStyle(color: _isAvailable! ? Colors.green : Colors.red, fontWeight: FontWeight.bold)),
              if (_isAvailable!) ...[
                const SizedBox(height: 20),
                SizedBox(width: double.infinity, child: ElevatedButton(style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white), onPressed: _isOperationInProgress ? null : _claimAndAutomate, child: _isOperationInProgress ? const CircularProgressIndicator(color: Colors.white) : const Text('Claim & Update Bluesky Handle'))),
              ]
            ],
            const SizedBox(height: 30),
            const Text('Your Reserved Handles:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Expanded(child: ListView.builder(itemCount: _myPreviousHandles.length, itemBuilder: (context, index) {
                  final h = _myPreviousHandles[index];
                  final fullHandle = '${h['handle']}.${h['domain']}';
                  return ListTile(title: Text(fullHandle), trailing: ElevatedButton(onPressed: _isOperationInProgress ? null : () => _revertToHandle(fullHandle), child: const Text('Use this')));
            })),
          ],
        ),
      ),
    );
  }
}
