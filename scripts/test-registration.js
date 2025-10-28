#!/usr/bin/env node

const http = require('http');

const testRegistration = async () => {
  const postData = JSON.stringify({
    email: 'newuser@example.com',
    name: 'New User',
    age: 25,
    password: 'password123',
    confirmPassword: 'password123'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/v1/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('📊 注册 API 测试结果:');
        console.log(`  状态码: ${res.statusCode}`);
        console.log(`  响应头: ${JSON.stringify(res.headers, null, 2)}`);
        console.log(`  响应数据: ${data}`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`  解析后的数据: ${JSON.stringify(jsonData, null, 2)}`);
        } catch (e) {
          console.log(`  响应不是有效的 JSON`);
        }
        
        resolve({ success: res.statusCode === 201, status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ 请求错误: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.write(postData);
    req.end();
  });
};

// 测试登录
const testLogin = async () => {
  const postData = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\n📊 登录 API 测试结果:');
        console.log(`  状态码: ${res.statusCode}`);
        console.log(`  响应数据: ${data}`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`  解析后的数据: ${JSON.stringify(jsonData, null, 2)}`);
        } catch (e) {
          console.log(`  响应不是有效的 JSON`);
        }
        
        resolve({ success: res.statusCode === 200, status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ 请求错误: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.write(postData);
    req.end();
  });
};

// 运行测试
const runTests = async () => {
  console.log('🧪 测试用户注册和登录功能...\n');
  
  await testRegistration();
  await testLogin();
  
  console.log('\n✅ 测试完成');
};

if (require.main === module) {
  runTests();
}

module.exports = { testRegistration, testLogin };
