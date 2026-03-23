import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../api_service.dart';
import 'login_screen.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  String _actionType = 'pickup';
  String _unitType = 'single';
  
  final TextEditingController _serialController = TextEditingController();
  int _quantity = 1;
  int _qtyDamaged = 0;
  String _condition = 'good';

  bool _isScanning = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _serialController.dispose();
    super.dispose();
  }

  void _handleActionUnitTypeChange() {
    setState(() {
      _quantity = 1;
      _qtyDamaged = 0;
      _condition = 'good';
    });
  }

  void _handleScan(BarcodeCapture capture) {
    if (_isLoading) return;
    for (final barcode in capture.barcodes) {
      if (barcode.rawValue != null) {
        setState(() {
          _serialController.text = barcode.rawValue!;
          _isScanning = false;
        });
        break;
      }
    }
  }

  Future<void> _submitForm() async {
    final serial = _serialController.text.trim();
    if (serial.isEmpty) {
      _showResultSnackBar('Please enter or scan a serial code.', isError: true);
      return;
    }

    if (_unitType == 'bulk' && _quantity < 1) {
      _showResultSnackBar('Quantity must be at least 1.', isError: true);
      return;
    }

    if (_unitType == 'bulk' && _actionType == 'return' && _qtyDamaged > _quantity) {
      _showResultSnackBar('Damaged quantity cannot exceed total quantity.', isError: true);
      return;
    }

    setState(() => _isLoading = true);

    int? reqQty;
    int? reqQtyGood;
    int? reqQtyDamaged;
    String? reqCondition;
    bool? reqConditionSubmitted;

    if (_unitType == 'bulk') {
      if (_actionType == 'pickup') {
        reqQty = _quantity;
      } else {
        reqQtyGood = _quantity - _qtyDamaged;
        reqQtyDamaged = _qtyDamaged;
      }
    } else {
      if (_actionType == 'return') {
        reqCondition = _condition;
        reqConditionSubmitted = true;
      }
    }

    final res = await ApiService.scanItem(
      serial,
      _actionType,
      quantity: reqQty,
      qtyGood: reqQtyGood,
      qtyDamaged: reqQtyDamaged,
      condition: reqCondition,
      conditionSubmitted: reqConditionSubmitted,
    );

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (res['requires_quantity'] == true || res['requires_condition'] == true || res['success'] == false || res['error'] != null) {
      _showResultSnackBar(res['error'] ?? res['message'] ?? 'Action failed configuration check.', isError: true);
      return;
    }

    _showResultSnackBar(res['message'] ?? 'Action successful', isError: false);
    
    // Reset Form
    setState(() {
      _serialController.clear();
      _quantity = 1;
      _qtyDamaged = 0;
      _condition = 'good';
    });
  }

  void _showResultSnackBar(String message, {required bool isError}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: isError ? Colors.red : Colors.green,
    ));
  }

  Widget _buildCounterRow({
    required String label,
    required int value,
    required Color color,
    required VoidCallback onDecrement,
    required VoidCallback onIncrement,
    Color labelColor = Colors.black87,
  }) {
    return Row(
      children: [
        Expanded(
          child: Text(label, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: labelColor)),
        ),
        Container(
          height: 40,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              IconButton(
                onPressed: onDecrement,
                icon: const Icon(Icons.remove, size: 18),
                color: color,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 40),
              ),
              Container(
                width: 40,
                alignment: Alignment.center,
                child: Text('$value', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
              ),
              IconButton(
                onPressed: onIncrement,
                icon: const Icon(Icons.add, size: 18),
                color: color,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 40),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Inventory Scanner', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Log Out',
            onPressed: () async {
              await ApiService.logout();
              if (mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
              }
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ACTION TOGGLE
                const Text('ACTION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () { setState(() { _actionType = 'pickup'; _handleActionUnitTypeChange(); }); },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: _actionType == 'pickup' ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: _actionType == 'pickup' ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : [],
                            ),
                            child: const Text('Pickup', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () { setState(() { _actionType = 'return'; _handleActionUnitTypeChange(); }); },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: _actionType == 'return' ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: _actionType == 'return' ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : [],
                            ),
                            child: const Text('Return', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // UNIT TYPE TOGGLE
                const Text('ITEM TYPE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () { setState(() { _unitType = 'single'; _handleActionUnitTypeChange(); }); },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: _unitType == 'single' ? const Color(0xFF0F172A) : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.label, size: 16, color: _unitType == 'single' ? Colors.white : Colors.black87),
                                const SizedBox(width: 8),
                                Text('Single Item', style: TextStyle(fontWeight: FontWeight.bold, color: _unitType == 'single' ? Colors.white : Colors.black87)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () { setState(() { _unitType = 'bulk'; _handleActionUnitTypeChange(); }); },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: _unitType == 'bulk' ? Colors.purple : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.layers, size: 16, color: _unitType == 'bulk' ? Colors.white : Colors.black87),
                                const SizedBox(width: 8),
                                Text('Bulk Item', style: TextStyle(fontWeight: FontWeight.bold, color: _unitType == 'bulk' ? Colors.white : Colors.black87)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                const Divider(),
                const SizedBox(height: 16),

                // SERIAL INPUT
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _unitType == 'single' ? 'SERIAL NUMBER (SN)' : 'BULK ITEM CODE',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2),
                    ),
                    if (!_isScanning)
                      GestureDetector(
                        onTap: () => setState(() => _isScanning = true),
                        child: const Row(
                          children: [
                            Icon(Icons.camera_alt, size: 14, color: Colors.indigo),
                            SizedBox(width: 4),
                            Text('Scan with Camera', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.indigo)),
                          ],
                        ),
                      )
                    else
                      GestureDetector(
                        onTap: () => setState(() => _isScanning = false),
                        child: const Row(
                          children: [
                            Icon(Icons.close, size: 14, color: Colors.red),
                            SizedBox(width: 4),
                            Text('Close Camera', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.red)),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                if (_isScanning) ...[
                  Container(
                    height: 250,
                    margin: const EdgeInsets.only(bottom: 16),
                    clipBehavior: Clip.hardEdge,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.indigo, width: 2),
                    ),
                    child: MobileScanner(
                      onDetect: _handleScan,
                      controller: MobileScannerController(
                        detectionSpeed: DetectionSpeed.noDuplicates,
                        facing: CameraFacing.back,
                      ),
                    ),
                  ),
                ],
                TextField(
                  controller: _serialController,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.qr_code_2, color: Colors.grey),
                    hintText: _unitType == 'single' ? 'Enter serial number...' : 'Enter bulk code...',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.indigo, width: 2)),
                  ),
                  textCapitalization: TextCapitalization.characters,
                ),
                const SizedBox(height: 24),

                // BULK QUANTITIES
                if (_unitType == 'bulk') ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildCounterRow(
                          label: _actionType == 'pickup' ? 'Quantity to Pickup' : 'Total Returned',
                          value: _quantity,
                          color: _actionType == 'pickup' ? Colors.indigo : Colors.black87,
                          onDecrement: () => setState(() => _quantity = _quantity > 1 ? _quantity - 1 : 1),
                          onIncrement: () => setState(() => _quantity++),
                        ),
                        if (_actionType == 'return') ...[
                          const SizedBox(height: 16),
                          const Divider(),
                          const SizedBox(height: 16),
                          _buildCounterRow(
                            label: 'Quantity Damaged',
                            value: _qtyDamaged,
                            color: Colors.red,
                            labelColor: Colors.red.shade700,
                            onDecrement: () => setState(() => _qtyDamaged = _qtyDamaged > 0 ? _qtyDamaged - 1 : 0),
                            onIncrement: () => setState(() {
                              if (_qtyDamaged < _quantity) _qtyDamaged++;
                            }),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                            decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Good Condition:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.green)),
                                Text('${_quantity - _qtyDamaged}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.green)),
                              ],
                            ),
                          ),
                        ]
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // SINGLE CONDITION
                if (_unitType == 'single' && _actionType == 'return') ...[
                  const Text('ITEM CONDITION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2)),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        RadioListTile<String>(
                          title: const Text('Good Condition', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 14)),
                          value: 'good',
                          groupValue: _condition,
                          onChanged: (val) => setState(() => _condition = val!),
                          activeColor: Colors.green,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        ),
                        const Divider(height: 1, indent: 16, endIndent: 16),
                        RadioListTile<String>(
                          title: const Text('Damaged', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 14)),
                          value: 'damaged',
                          groupValue: _condition,
                          onChanged: (val) => setState(() => _condition = val!),
                          activeColor: Colors.red,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // SUBMIT BUTTON
                ElevatedButton(
                  onPressed: _isLoading ? null : _submitForm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 4,
                  ),
                  child: _isLoading 
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text('SUBMIT ${_actionType.toUpperCase()}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
          
          if (_isLoading)
            Container(
              color: Colors.white.withOpacity(0.5),
              child: const Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }
}
