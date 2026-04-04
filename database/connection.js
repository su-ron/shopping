// MySQL数据库连接池
const mysql = require('mysql2/promise');
const config = require('./config');

class Database {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    // 初始化连接池
    async init() {
        try {
            this.pool = mysql.createPool(config);
            this.isConnected = true;
            console.log('✅ 数据库连接池初始化成功');

            // 测试连接
            await this.testConnection();
            return this.pool;
        } catch (error) {
            console.error('❌ 数据库连接池初始化失败:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    // 测试连接
    async testConnection() {
        try {
            const connection = await this.pool.getConnection();
            console.log('✅ 数据库连接测试成功');
            connection.release();
            return true;
        } catch (error) {
            console.error('❌ 数据库连接测试失败:', error.message);
            throw error;
        }
    }

    // 执行查询
    async query(sql, params = []) {
        if (!this.isConnected) {
            await this.init();
        }

        try {
            const [results] = await this.pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('❌ 数据库查询错误:', error.message);
            console.error('SQL:', sql);
            console.error('参数:', params);
            throw error;
        }
    }

    // 执行事务
    async transaction(callback) {
        if (!this.isConnected) {
            await this.init();
        }

        const connection = await this.pool.getConnection();

        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            console.error('❌ 事务执行失败:', error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    // 获取连接（手动管理）
    async getConnection() {
        if (!this.isConnected) {
            await this.init();
        }
        return await this.pool.getConnection();
    }

    // 关闭连接池
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            console.log('✅ 数据库连接池已关闭');
        }
    }

    // 健康检查
    async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as status');
            return {
                status: 'healthy',
                database: config.database,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // 创建数据库（如果不存在）
    async createDatabaseIfNotExists() {
        try {
            // 临时连接（不指定数据库）
            const tempConfig = { ...config };
            delete tempConfig.database;

            const tempPool = mysql.createPool(tempConfig);
            const [rows] = await tempPool.execute(
                `CREATE DATABASE IF NOT EXISTS ${config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
            await tempPool.end();

            console.log(`✅ 数据库 ${config.database} 已创建或已存在`);
            return true;
        } catch (error) {
            console.error(`❌ 创建数据库失败:`, error.message);
            throw error;
        }
    }

    // 执行SQL文件
    async executeSqlFile(filePath) {
        const fs = require('fs').promises;
        const path = require('path');

        try {
            const sqlContent = await fs.readFile(filePath, 'utf8');
            // 分割SQL语句（以分号结尾）
            const sqlStatements = sqlContent
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);

            console.log(`📝 开始执行SQL文件: ${path.basename(filePath)}`);
            console.log(`📊 共 ${sqlStatements.length} 条SQL语句`);

            for (let i = 0; i < sqlStatements.length; i++) {
                const sql = sqlStatements[i];
                try {
                    await this.query(sql);
                    console.log(`✅ 执行成功 (${i + 1}/${sqlStatements.length})`);
                } catch (error) {
                    console.error(`❌ 执行失败 (${i + 1}/${sqlStatements.length}):`, error.message);
                    console.error('失败SQL:', sql.substring(0, 200) + '...');
                    throw error;
                }
            }

            console.log(`🎉 SQL文件执行完成: ${path.basename(filePath)}`);
            return true;
        } catch (error) {
            console.error(`❌ 执行SQL文件失败:`, error.message);
            throw error;
        }
    }

    // 数据库迁移工具
    async migrate() {
        const path = require('path');
        const schemaFile = path.join(__dirname, 'schema.sql');

        try {
            console.log('🚀 开始数据库迁移...');

            // 1. 创建数据库
            await this.createDatabaseIfNotExists();

            // 2. 执行schema.sql
            await this.executeSqlFile(schemaFile);

            console.log('🎉 数据库迁移完成！');
            return true;
        } catch (error) {
            console.error('❌ 数据库迁移失败:', error.message);
            throw error;
        }
    }

    // 数据备份
    async backup(backupPath = './backups') {
        const fs = require('fs').promises;
        const path = require('path');
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        try {
            // 确保备份目录存在
            await fs.mkdir(backupPath, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupPath, `backup-${timestamp}.sql`);

            // 使用mysqldump备份
            const command = `mysqldump -h${config.host} -P${config.port} -u${config.user} -p${config.password} ${config.database} > "${backupFile}"`;

            await execPromise(command);
            console.log(`✅ 数据库备份完成: ${backupFile}`);

            return backupFile;
        } catch (error) {
            console.error('❌ 数据库备份失败:', error.message);
            throw error;
        }
    }
}

// 创建单例实例
const database = new Database();

// 导出实例和类
module.exports = {
    db: database,
    Database
};