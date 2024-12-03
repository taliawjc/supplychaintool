export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    try {
      // Parse incoming JSON
      const servers = await request.json();

      // Validate input
      if (!Array.isArray(servers)) {
        throw new Error('Input must be an array of servers');
      }

      // Estimation parameters
      const ESTIMATION_FACTORS = {
        rack: {
          baseTime: 2, // hours for standard rack server
          complexityMultiplier: 1.2,
        },
        blade: {
          baseTime: 3, // hours for blade server
          complexityMultiplier: 1.5,
        },
        custom: {
          baseTime: 4, // hours for custom servers
          complexityMultiplier: 2,
        },
        manufacturers: {
          'Dell': 0.9,
          'HP': 1.0,
          'Lenovo': 1.1,
          'SuperMicro': 1.2,
        }
      };

      // Validation function
      const validateServer = (server) => {
        if (typeof server !== 'object' || server === null) {
          throw new Error('Invalid server object');
        }

        const requiredFields = ['type', 'manufacturer', 'model', 'quantity'];
        for (const field of requiredFields) {
          if (!server[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        if (!['rack', 'blade', 'custom'].includes(server.type)) {
          throw new Error('Invalid server type');
        }

        if (typeof server.quantity !== 'number' || server.quantity <= 0) {
          throw new Error('Quantity must be a positive number');
        }
      };

      // Estimation calculation
      const calculateEstimation = (servers) => {
        let totalTime = 0;
        const breakdownByServer = servers.map(server => {
          // Validate each server
          validateServer(server);

          // Base time calculation
          const typeFactors = ESTIMATION_FACTORS[server.type];
          const manufacturerFactor = ESTIMATION_FACTORS.manufacturers[server.manufacturer] || 1;
          
          const baseTime = typeFactors.baseTime;
          const serverTime = baseTime * manufacturerFactor * typeFactors.complexityMultiplier * server.quantity;
          
          totalTime += serverTime;

          return {
            type: server.type,
            manufacturer: server.manufacturer,
            model: server.model,
            quantity: server.quantity,
            estimatedTime: serverTime
          };
        });

        // Determine complexity
        let complexity = 'Low';
        if (totalTime > 20) complexity = 'High';
        else if (totalTime > 10) complexity = 'Medium';

        return {
          totalTime,
          breakdownByServer,
          complexity
        };
      };

      // Perform estimation
      const result = calculateEstimation(servers);

      // Return result
      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      // Handle validation or processing errors
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  }
};
