/**
 * PM2 Multi-Environment Configuration
 * 
 * Manages dev, staging, and production environments
 * Each environment runs on a different port with isolated configuration
 */
module.exports = {
  apps: [
    // Development Environment
    {
      name: 'pr-notifier-dev',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'development',
        ENV_FILE: '.env.development',
      },
      
      // Dev: More lenient restart policies
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      min_uptime: '5s',
      max_restarts: 20,
      restart_delay: 1000,
      
      // Dev logs
      error_file: './logs/dev-error.log',
      out_file: './logs/dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    
    // Staging Environment
    {
      name: 'pr-notifier-staging',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'staging',
        ENV_FILE: '.env.staging',
      },
      
      // Staging: Production-like policies
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      
      // Staging logs
      error_file: './logs/staging-error.log',
      out_file: './logs/staging-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    
    // Production Environment
    {
      name: 'pr-notifier-prod',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        ENV_FILE: '.env.production',
      },
      
      // Production: Strict policies
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      
      // Production logs
      error_file: './logs/prod-error.log',
      out_file: './logs/prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Production monitoring
      listen_timeout: 10000,
      kill_timeout: 5000,
      source_map_support: true,
    },
    
    // Legacy single-environment config (for backward compatibility)
    {
      name: 'github-pr-notifier',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      
      listen_timeout: 10000,
      kill_timeout: 5000,
      source_map_support: true,
    },
  ],

  /**
   * Deployment Configuration (Optional)
   * 
   * Enables remote deployment via PM2
   * Usage: pm2 deploy production setup|update
   */
  deploy: {
    production: {
      // SSH connection
      user: 'your-user',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/github-pr-notifier.git',
      path: '/var/www/github-pr-notifier',
      
      // Deployment hooks
      'pre-deploy-local': 'echo "Deploying to production..."',
      'post-deploy': 'yarn install && yarn build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};
