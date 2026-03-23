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
  String? _scannedData;
  bool _isProcessing = false;
  final TextEditingController _serialController = TextEditingController();

  @override
  void dispose() {
    _serialController.dispose();
    super.dispose();
  }

  void _handleScan(BarcodeCapture capture) {
    if (_isProcessing) return;
    for (final barcode in capture.barcodes) {
      if (barcode.rawValue != null) {
        setState(() {
          _scannedData = barcode.rawValue;
          _isProcessing = true;
        });
        _showActionDialog(_scannedData!);
        break;
      }
    }
  }

  /// Fire pickup or return action to the API
  Future<void> _processAction(
    String serialNumber,
    String action, {
    int? quantity,
    int? qtyGood,
    int? qtyDamaged,
    String? condition,
    bool? conditionSubmitted,
  }) async {
    setState(() => _isProcessing = true);
    final res = await ApiService.scanItem(
      serialNumber,
      action,
      quantity: quantity,
      qtyGood: qtyGood,
      qtyDamaged: qtyDamaged,
      condition: condition,
      conditionSubmitted: conditionSubmitted,
    );

    if (!mounted) return;

    // Server asks for quantity (bulk edge case)
    if (res['requires_quantity'] == true) {
      _showQuantityDialog(serialNumber, action, res);
      return;
    }

    // Server asks for condition (single return)
    if (res['requires_condition'] == true) {
      _showConditionDialog(serialNumber, action, res);
      return;
    }

    if (res['success'] == true) {
      _showResultSnackBar(res['message'] ?? 'Action successful', isError: false);
    } else {
      _showResultSnackBar('Error: ${res['error']}', isError: true);
    }
    setState(() => _isProcessing = false);
  }

  void _showResultSnackBar(String message, {required bool isError}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: isError ? Colors.red : Colors.green,
    ));
  }

  /// Quantity picker dialog for bulk items
  Future<void> _showQuantityDialog(
      String serialNumber, String action, Map<String, dynamic> data) async {
    final int maxQty = data['max_quantity'] ?? 1;
    final bool isReturn = action == 'return' || data['is_return'] == true;

    int qtyMain = maxQty;
    int totalReturned = maxQty;
    int qtyDamaged = 0;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              const Icon(Icons.layers, color: Colors.purple, size: 20),
              const SizedBox(width: 8),
              Text(isReturn ? 'Return Quantities' : 'Pickup Quantity',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(data['message'] ?? '', style: const TextStyle(fontSize: 13)),
              const SizedBox(height: 16),
              if (isReturn) ...[
                _counterRow(
                  label: 'Total Returned',
                  value: totalReturned,
                  color: Colors.indigo,
                  onDecrement: () => setDialogState(() {
                    totalReturned = totalReturned > 1 ? totalReturned - 1 : 1;
                    if (qtyDamaged > totalReturned) qtyDamaged = totalReturned;
                  }),
                  onIncrement: () => setDialogState(() =>
                      totalReturned = (totalReturned < maxQty) ? totalReturned + 1 : totalReturned),
                ),
                const SizedBox(height: 8),
                _counterRow(
                  label: 'Damaged Items',
                  value: qtyDamaged,
                  color: Colors.red,
                  onDecrement: () => setDialogState(() =>
                      qtyDamaged = qtyDamaged > 0 ? qtyDamaged - 1 : 0),
                  onIncrement: () => setDialogState(() =>
                      qtyDamaged = (qtyDamaged < totalReturned) ? qtyDamaged + 1 : qtyDamaged),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Good Condition:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.green)),
                      Text('${totalReturned - qtyDamaged}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.green)),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text('Max to return: $maxQty',
                    style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ] else ...[
                _counterRow(
                  label: 'Quantity to Pickup',
                  value: qtyMain,
                  color: Colors.amber.shade800,
                  onDecrement: () => setDialogState(() => qtyMain = qtyMain > 1 ? qtyMain - 1 : 1),
                  onIncrement: () => setDialogState(() => qtyMain = qtyMain < maxQty ? qtyMain + 1 : qtyMain),
                ),
                const SizedBox(height: 4),
                Text('Max available: $maxQty',
                    style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                setState(() => _isProcessing = false);
              },
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                if (isReturn) {
                  _processAction(serialNumber, action,
                      qtyGood: totalReturned - qtyDamaged, qtyDamaged: qtyDamaged);
                } else {
                  _processAction(serialNumber, action, quantity: qtyMain);
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
              child: const Text('Confirm', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _counterRow({
    required String label,
    required int value,
    required Color color,
    required VoidCallback onDecrement,
    required VoidCallback onIncrement,
  }) {
    return Row(
      children: [
        Expanded(
          child: Text(label,
              style: TextStyle(fontWeight: FontWeight.w600, color: color, fontSize: 13)),
        ),
        IconButton(
          onPressed: onDecrement,
          icon: const Icon(Icons.remove_circle_outline),
          color: color,
        ),
        Text('$value',
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        IconButton(
          onPressed: onIncrement,
          icon: const Icon(Icons.add_circle_outline),
          color: color,
        ),
      ],
    );
  }

  /// Condition dialog for single unit return
  Future<void> _showConditionDialog(
      String serialNumber, String action, Map<String, dynamic> data) async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Condition Check',
            style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text(data['message'] ?? 'Please specify the condition.'),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              _processAction(serialNumber, action,
                  condition: 'good', conditionSubmitted: true);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            icon: const Icon(Icons.check_circle, color: Colors.white, size: 16),
            label: const Text('Good', style: TextStyle(color: Colors.white)),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              _processAction(serialNumber, action,
                  condition: 'damaged', conditionSubmitted: true);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            icon: const Icon(Icons.warning, color: Colors.white, size: 16),
            label: const Text('Damaged', style: TextStyle(color: Colors.white)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() => _isProcessing = false);
            },
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  /// Main action dialog — shows item info including unit_type, then offers Pickup / Return
  Future<void> _showActionDialog(String serialNumber) async {
    setState(() => _isProcessing = true);
    final res = await ApiService.scanItem(serialNumber, 'verify');

    if (!mounted) return;

    if (res['success'] == false || res['error'] != null) {
      _showResultSnackBar(res['error'] ?? 'Item not found in your inventory.', isError: true);
      setState(() => _isProcessing = false);
      return;
    }

    final String productName = res['product_name'] ?? 'Unknown Item';
    final String unitName = res['unit_name'] ?? '';
    final String currentStatus = res['status'] ?? 'unknown';
    final String unitType = res['unit_type'] ?? 'single';
    final int availableQty = res['available_quantity'] ?? 1;
    final bool isBulk = unitType == 'bulk';

    final String displayTitle =
        unitName.isNotEmpty ? '$productName ($unitName)' : productName;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Icon(isBulk ? Icons.layers : Icons.label,
                  color: isBulk ? Colors.purple : Colors.indigo, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(displayTitle,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Unit type chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isBulk ? Colors.purple.shade50 : Colors.indigo.shade50,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isBulk ? 'BULK ITEM' : 'SINGLE UNIT (SN)',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                    color: isBulk ? Colors.purple : Colors.indigo,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              if (!isBulk)
                _infoRow('Serial Number', serialNumber, Icons.qr_code_2),
              if (isBulk)
                _infoRow('Available Qty', '$availableQty', Icons.inventory_2),
              _infoRow('Status', currentStatus.toUpperCase(), Icons.info_outline),
              const SizedBox(height: 16),
              const Text('What would you like to do?',
                  style: TextStyle(fontSize: 13, color: Colors.grey, fontWeight: FontWeight.bold)),
            ],
          ),
          actionsAlignment: MainAxisAlignment.spaceEvenly,
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                setState(() => _isProcessing = false);
              },
              child: const Text('Cancel'),
            ),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                if (isBulk) {
                  _showQuantityDialog(serialNumber, 'pickup', {
                    'max_quantity': availableQty,
                    'is_return': false,
                    'message': 'How many $productName to pick up?',
                  });
                } else {
                  _processAction(serialNumber, 'pickup');
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.amber),
              icon: const Icon(Icons.arrow_forward, color: Colors.black, size: 16),
              label: Text(
                isBulk ? 'Pick Up (qty)' : 'Pick Up',
                style: const TextStyle(
                    color: Colors.black, fontWeight: FontWeight.bold),
              ),
            ),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                if (isBulk) {
                  _showQuantityDialog(serialNumber, 'return', {
                    'max_quantity': availableQty,
                    'is_return': true,
                    'message': 'How many $productName are being returned?',
                  });
                } else {
                  // For single units, show condition dialog first
                  _showConditionDialog(serialNumber, 'return', {
                    'message': 'What is the condition of $productName?',
                    'requires_condition': true,
                  });
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
              icon: const Icon(Icons.arrow_back, color: Colors.white, size: 16),
              label: Text(
                isBulk ? 'Return (qty)' : 'Return',
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 14, color: Colors.grey),
          const SizedBox(width: 6),
          Text('$label: ', style: const TextStyle(fontSize: 12, color: Colors.grey)),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory Scanner',
            style: TextStyle(fontWeight: FontWeight.bold)),
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
      body: Column(
        children: [
          Expanded(
            flex: 2,
            child: MobileScanner(
              onDetect: _handleScan,
              controller: MobileScannerController(
                detectionSpeed: DetectionSpeed.noDuplicates,
                facing: CameraFacing.back,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Container(
              color: Colors.white,
              width: double.infinity,
              padding:
                  const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Scanning for QR / Barcodes…',
                        style: TextStyle(fontSize: 15, color: Colors.black54)),
                    const SizedBox(height: 6),
                    // Legend chips
                    Wrap(
                      spacing: 8,
                      children: [
                        Chip(
                          avatar: const Icon(Icons.label, size: 14, color: Colors.indigo),
                          label: const Text('Single (SN)',
                              style: TextStyle(fontSize: 11, color: Colors.indigo)),
                          backgroundColor: Colors.indigo.shade50,
                          padding: EdgeInsets.zero,
                        ),
                        Chip(
                          avatar: const Icon(Icons.layers, size: 14, color: Colors.purple),
                          label: const Text('Bulk (qty)',
                              style: TextStyle(fontSize: 11, color: Colors.purple)),
                          backgroundColor: Colors.purple.shade50,
                          padding: EdgeInsets.zero,
                        ),
                      ],
                    ),
                    if (_scannedData != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text('Last scanned: $_scannedData',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, color: Colors.indigo)),
                      ),
                    const SizedBox(height: 16),
                    const Row(
                      children: [
                        Expanded(child: Divider()),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8.0),
                          child: Text('OR ENTER MANUALLY',
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black38)),
                        ),
                        Expanded(child: Divider()),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _serialController,
                            decoration: const InputDecoration(
                              border: OutlineInputBorder(),
                              labelText: 'Serial / Bulk Code',
                              contentPadding:
                                  EdgeInsets.symmetric(horizontal: 16),
                            ),
                            onSubmitted: (v) {
                              if (v.trim().isNotEmpty) {
                                FocusScope.of(context).unfocus();
                                setState(() => _scannedData = v.trim());
                                _showActionDialog(v.trim());
                                _serialController.clear();
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () {
                            final serialText = _serialController.text.trim();
                            if (serialText.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text('Please enter a valid code.')),
                              );
                              return;
                            }
                            FocusScope.of(context).unfocus();
                            setState(() => _scannedData = serialText);
                            _showActionDialog(serialText);
                            _serialController.clear();
                          },
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 16),
                            backgroundColor: const Color(0xFF0F172A),
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Verify'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
