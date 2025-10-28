#!/usr/bin/env node

/**
 * PartyTix 健康检查脚本
 * 检查前端、后端和数据库的连接状态
 */

const https = require('https');
const http = require('http');

// 颜色定义
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// 日志函数
function log(level, message) {
    const timestamp = new Date().toISOString();
    const color = {
        'INFO': colors.blue,
        'SUCCESS': colors.green,
        'WARNING': colors.yellow,
        'ERROR': colors.red
    }[level] || colors.reset;
    
    console.log(`${color}[${level}]${colors.reset} ${timestamp} - ${message}`);
}

// HTTP 请求函数
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        
        const req = client.request(url, {
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'PartyTix-HealthCheck/1.0',
                ...options.headers
            },
            timeout: options.timeout || 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        req.end();
    });
}

// 检查后端健康状态
async function checkBackendHealth(backendUrl) {
    try {
        log('INFO', `检查后端健康状态: ${backendUrl}`);
        
        const response = await makeRequest(`${backendUrl}/health`);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            log('SUCCESS', `后端健康检查通过: ${data.status}`);
            return { status: 'healthy', data };
        } else {
            log('ERROR', `后端健康检查失败: HTTP ${response.statusCode}`);
            return { status: 'unhealthy', error: `HTTP ${response.statusCode}` };
        }
    } catch (error) {
        log('ERROR', `后端健康检查失败: ${error.message}`);
        return { status: 'unhealthy', error: error.message };
    }
}

// 检查后端 API
async function checkBackendAPI(backendUrl) {
    try {
        log('INFO', `检查后端 API: ${backendUrl}/v1/events`);
        
        const response = await makeRequest(`${backendUrl}/v1/events`);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            log('SUCCESS', `后端 API 检查通过: 返回 ${data.data?.length || 0} 个活动`);
            return { status: 'healthy', data };
        } else {
            log('ERROR', `后端 API 检查失败: HTTP ${response.statusCode}`);
            return { status: 'unhealthy', error: `HTTP ${response.statusCode}` };
        }
    } catch (error) {
        log('ERROR', `后端 API 检查失败: ${error.message}`);
        return { status: 'unhealthy', error: error.message };
    }
}

// 检查前端
async function checkFrontend(frontendUrl) {
    try {
        log('INFO', `检查前端: ${frontendUrl}`);
        
        const response = await makeRequest(frontendUrl);
        
        if (response.statusCode === 200) {
            // 检查是否包含 PartyTix 相关内容
            if (response.body.includes('PartyTix') || response.body.includes('party-tix')) {
                log('SUCCESS', '前端检查通过: 页面正常加载');
                return { status: 'healthy' };
            } else {
                log('WARNING', '前端检查警告: 页面内容可能不正确');
                return { status: 'warning' };
            }
        } else {
            log('ERROR', `前端检查失败: HTTP ${response.statusCode}`);
            return { status: 'unhealthy', error: `HTTP ${response.statusCode}` };
        }
    } catch (error) {
        log('ERROR', `前端检查失败: ${error.message}`);
        return { status: 'unhealthy', error: error.message };
    }
}

// 检查数据库连接（通过后端 API）
async function checkDatabase(backendUrl) {
    try {
        log('INFO', `检查数据库连接: ${backendUrl}/v1/events`);
        
        const response = await makeRequest(`${backendUrl}/v1/events`);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            if (data.success) {
                log('SUCCESS', '数据库连接正常');
                return { status: 'healthy', data };
            } else {
                log('ERROR', `数据库连接失败: ${data.error}`);
                return { status: 'unhealthy', error: data.error };
            }
        } else {
            log('ERROR', `数据库检查失败: HTTP ${response.statusCode}`);
            return { status: 'unhealthy', error: `HTTP ${response.statusCode}` };
        }
    } catch (error) {
        log('ERROR', `数据库检查失败: ${error.message}`);
        return { status: 'unhealthy', error: error.message };
    }
}

// 生成健康报告
function generateReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log(colors.cyan + 'PARTYTIX 健康检查报告' + colors.reset);
    console.log('='.repeat(60));
    
    const components = [
        { name: '前端', result: results.frontend },
        { name: '后端健康检查', result: results.backendHealth },
        { name: '后端 API', result: results.backendAPI },
        { name: '数据库', result: results.database }
    ];
    
    let allHealthy = true;
    
    components.forEach(component => {
        const status = component.result.status;
        const color = status === 'healthy' ? colors.green : 
                     status === 'warning' ? colors.yellow : colors.red;
        const icon = status === 'healthy' ? '✅' : 
                    status === 'warning' ? '⚠️' : '❌';
        
        console.log(`${icon} ${component.name}: ${color}${status.toUpperCase()}${colors.reset}`);
        
        if (component.result.error) {
            console.log(`   错误: ${component.result.error}`);
        }
        
        if (status !== 'healthy') {
            allHealthy = false;
        }
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (allHealthy) {
        console.log(colors.green + '🎉 所有组件都运行正常！' + colors.reset);
    } else {
        console.log(colors.red + '⚠️ 发现问题，请检查上述错误' + colors.reset);
    }
    
    console.log('='.repeat(60) + '\n');
    
    return allHealthy;
}

// 主函数
async function main() {
    console.log(colors.cyan + '🔍 PartyTix 健康检查开始...' + colors.reset + '\n');
    
    // 从环境变量或命令行参数获取 URL
    const frontendUrl = process.env.FRONTEND_URL || process.argv[2] || 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL || process.argv[3] || 'http://localhost:3001';
    
    log('INFO', `前端 URL: ${frontendUrl}`);
    log('INFO', `后端 URL: ${backendUrl}`);
    
    try {
        // 并行执行所有检查
        const [frontend, backendHealth, backendAPI, database] = await Promise.all([
            checkFrontend(frontendUrl),
            checkBackendHealth(backendUrl),
            checkBackendAPI(backendUrl),
            checkDatabase(backendUrl)
        ]);
        
        const results = {
            frontend,
            backendHealth,
            backendAPI,
            database
        };
        
        // 生成报告
        const allHealthy = generateReport(results);
        
        // 退出码
        process.exit(allHealthy ? 0 : 1);
        
    } catch (error) {
        log('ERROR', `健康检查失败: ${error.message}`);
        process.exit(1);
    }
}

// 运行主函数
if (require.main === module) {
    main().catch(error => {
        console.error(colors.red + '健康检查脚本执行失败:' + colors.reset, error);
        process.exit(1);
    });
}

module.exports = {
    checkBackendHealth,
    checkBackendAPI,
    checkFrontend,
    checkDatabase,
    generateReport
};
