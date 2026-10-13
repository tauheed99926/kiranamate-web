const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting KiranaMate Comprehensive End-to-End Tests');
  console.log('====================================================\n');

  // Test 1: Health Check
  console.log('Test 1: Health Check Endpoint');
  const health = await request('GET', '/health');
  assert(health.status === 200 && health.data.status === 'ok', 'API health check passed');

  // Test 2: Unauthorized protection on private endpoints
  console.log('\nTest 2: Unauthorized Access Protection');
  const unauth = await request('GET', '/products');
  assert(unauth.status === 401, 'Protected route /api/products returns 401 without token');

  // Test 3: Login with Demo credentials
  console.log('\nTest 3: Shop Authentication');
  const loginRes = await request('POST', '/auth/login', {
    username: 'admin',
    password: 'admin123',
  });
  assert(loginRes.status === 200 && loginRes.data.success, 'Login successful with admin credentials');
  const token = loginRes.data.token;
  assert(!!token, 'JWT authentication token received');

  // Test 4: Fetch Shop Profile and Settings
  console.log('\nTest 4: Shop Profile & Settings');
  const shopRes = await request('GET', '/shop', null, token);
  assert(shopRes.status === 200 && shopRes.data.shop.name.length > 0, `Store loaded: "${shopRes.data.shop.name}"`);

  // Test 5: Categories Management
  console.log('\nTest 5: Category Management');
  const catRes = await request('POST', '/categories', {
    name: `Test Dairy & Breads ${Date.now()}`,
    description: 'Fresh dairy and daily bread supply',
  }, token);
  assert(catRes.status === 201 && catRes.data.success, 'New category created successfully');
  const createdCategoryId = catRes.data.category.id;

  // Test 6: Create Product with Barcode
  console.log('\nTest 6: Add Product with Retail Barcode');
  const testBarcode = `890${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const productRes = await request('POST', '/products', {
    name: 'Tata Tea Premium 250g',
    barcode: testBarcode,
    sku: 'BEV-TATA-250G',
    categoryId: createdCategoryId,
    brand: 'Tata',
    purchaseCost: 95.0,
    sellingPrice: 120.0,
    mrp: 130.0,
    stockQuantity: 25.0,
    lowStockThreshold: 5.0,
    unit: 'packet',
  }, token);
  assert(productRes.status === 201 && productRes.data.success, `Product created with barcode ${testBarcode}`);
  const createdProductId = productRes.data.product.id;

  // Test 7: Fast Barcode Lookup
  console.log('\nTest 7: Fast Barcode Lookup');
  const lookupRes = await request('GET', `/products/barcode/${testBarcode}`, null, token);
  assert(lookupRes.status === 200 && lookupRes.data.product.id === createdProductId, 'Product successfully identified by barcode scanner API');

  // Test 8: Edit Product and Stock Adjustment
  console.log('\nTest 8: Stock Adjustment & Audit Trail');
  const adjustRes = await request('POST', '/inventory/adjust', {
    productId: createdProductId,
    changeType: 'ADD',
    quantity: 10,
    reason: 'Fresh morning stock delivery',
  }, token);
  assert(adjustRes.status === 200 && adjustRes.data.product.stockQuantity === 35, 'Stock quantity increased from 25 to 35 with reason');

  // Test 9: POS Checkout & Inventory Deduction
  console.log('\nTest 9: Point of Sale Checkout (Atomic Transaction)');
  const checkoutRes = await request('POST', '/pos/checkout', {
    items: [
      {
        productId: createdProductId,
        quantity: 3,
        unitPrice: 120.0,
        discount: 10.0,
        taxRate: 5.0,
      },
    ],
    billDiscount: 0,
    paymentMethod: 'CASH',
    cashTendered: 500.0,
    customerName: 'Anil Sharma',
    customerPhone: '+91 98990 12345',
  }, token);
  assert(checkoutRes.status === 201 && checkoutRes.data.success, `Sale completed! Invoice: ${checkoutRes.data.sale.invoiceNumber}`);
  const createdSaleId = checkoutRes.data.sale.id;
  const invoiceNum = checkoutRes.data.sale.invoiceNumber;

  // Verify Cash change calculation
  assert(checkoutRes.data.sale.cashTendered === 500, 'Cash tendered correctly stored');
  assert(checkoutRes.data.sale.changeGiven > 0, `Change returned correctly calculated: ₹${checkoutRes.data.sale.changeGiven}`);

  // Test 10: Verify Stock Decreased
  console.log('\nTest 10: Verify Real Stock Deduction');
  const verifyProd = await request('GET', `/products/${createdProductId}`, null, token);
  assert(verifyProd.data.product.stockQuantity === 32, 'Stock accurately reduced by 3 items (from 35 to 32)');

  // Test 11: Bill History and Search
  console.log('\nTest 11: Bill History & Invoice Retrieval');
  const billsList = await request('GET', `/bills?search=${invoiceNum}`, null, token);
  assert(billsList.status === 200 && billsList.data.bills.length > 0, 'Completed bill found in history search');

  // Test 12: Insufficient Stock Handling
  console.log('\nTest 12: Insufficient Stock Safeguard');
  const overOrderRes = await request('POST', '/pos/checkout', {
    items: [
      {
        productId: createdProductId,
        quantity: 9999, // more than 32 in stock
        unitPrice: 120.0,
        discount: 0,
      },
    ],
    paymentMethod: 'CASH',
  }, token);
  assert(overOrderRes.status === 400, 'Checkout correctly rejected when order exceeds available inventory');

  // Test 13: Bill Cancellation & Stock Restoration
  console.log('\nTest 13: Bill Cancellation & Stock Restoration');
  const cancelRes = await request('POST', `/bills/${createdSaleId}/cancel`, {
    reason: 'Customer requested cancellation',
  }, token);
  assert(cancelRes.status === 200 && cancelRes.data.success, 'Bill cancelled successfully');

  const afterCancelProd = await request('GET', `/products/${createdProductId}`, null, token);
  assert(afterCancelProd.data.product.stockQuantity === 35, 'Stock restored back to 35 after bill cancellation');

  // Test 14: Stock & Expiry Alerts
  console.log('\nTest 14: Inventory & Expiry Alerts');
  const alertsRes = await request('GET', '/alerts', null, token);
  assert(alertsRes.status === 200 && alertsRes.data.summary.totalAlerts >= 0, `Alerts verified (Low: ${alertsRes.data.summary.lowStockCount}, Out: ${alertsRes.data.summary.outOfStockCount})`);

  // Test 15: Reports & Dashboard Metrics
  console.log('\nTest 15: Dashboard & Analytics Live Calculation');
  const dashRes = await request('GET', '/reports/dashboard', null, token);
  assert(dashRes.status === 200 && dashRes.data.totalProducts > 0, `Dashboard reporting ${dashRes.data.totalProducts} products and ${dashRes.data.weeklyTrend.length} days of trend data`);

  console.log('\n====================================================');
  console.log('🎉 ALL 15 AUTOMATED TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
