import { NextRequest, NextResponse } from 'next/server';
import { healthCheck, getAllActiveKOLs } from '@/lib/database';
import { isHeliusConfigured } from '@/lib/helius-api';

/**
 * Health check endpoint
 * Verifies database connection, Helius API configuration, and system status
 */

export async function GET() {
  try {
    const [dbHealthy, kols] = await Promise.all([
      healthCheck(),
      getAllActiveKOLs().catch(() => []), // Don't fail if KOLs table doesn't exist yet
    ]);

    const heliusConfigured = isHeliusConfigured();
    
    // Calculate system status
    const systemStatus = dbHealthy && heliusConfigured ? 'healthy' : 'degraded';
    
    return NextResponse.json({
      status: systemStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          connected: dbHealthy,
          activeKOLs: kols.length,
        },
        helius: {
          status: heliusConfigured ? 'configured' : 'not_configured',
          configured: heliusConfigured,
        },
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'System health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Extended health check with detailed diagnostics
 */
export async function POST() {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };

    // Database diagnostics
    let dbDiagnostics;
    try {
      const dbHealthy = await healthCheck();
      const kols = await getAllActiveKOLs();
      
      dbDiagnostics = {
        connected: dbHealthy,
        activeKOLs: kols.length,
        sampleKOLs: kols.slice(0, 3).map(kol => ({
          name: kol.name,
          wallet: kol.wallet_address?.slice(0, 8) + '...',
          twitter: kol.twitter_handle,
        })),
      };
    } catch (error) {
      dbDiagnostics = {
        connected: false,
        error: error instanceof Error ? error.message : 'Database connection failed',
      };
    }

    // API diagnostics
    const heliusConfigured = isHeliusConfigured();
    const apiDiagnostics = {
      helius: {
        configured: heliusConfigured,
        apiKey: heliusConfigured ? 'configured' : 'missing',
      },
    };

    return NextResponse.json({
      status: 'diagnostic',
      diagnostics,
      database: dbDiagnostics,
      apis: apiDiagnostics,
    });

  } catch (error) {
    console.error('Diagnostic check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Diagnostic check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}