import { Request, Response } from 'express';
import payload from 'payload';

export const GET = async (req: Request, res: Response) => {
  try {
    // Get userId from query params
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    // Fetch leads where buyerId equals the provided userId
    const leads = await payload.find({
      collection: 'leads',
      where: {
        buyerId: {
          equals: userId
        }
      },
      depth: 2, // Populate relationships
      limit: 100,
      sort: '-createdAt' // Sort by most recent first
    });

    // Return the leads
    return res.status(200).json({
      leads: leads.docs,
      totalDocs: leads.totalDocs,
      limit: leads.limit,
      page: leads.page,
      totalPages: leads.totalPages
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch leads',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST endpoint to create a new lead
export const POST = async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    const { buyerId, domainId, type, message, status } = req.body;

    // Validate required fields
    if (!buyerId || !domainId) {
      return res.status(400).json({ 
        error: 'buyerId and domainId are required' 
      });
    }

    // Create the lead
    const lead = await payload.create({
      collection: 'leads',
      data: {
        buyerId,
        domainId,
        type: type || 'Offer',
        message: message || '',
        status: status || 'Accepted'
      }
    });

    return res.status(201).json({
      message: 'Lead created successfully',
      lead
    });

  } catch (error) {
    console.error('Error creating lead:', error);
    return res.status(500).json({ 
      error: 'Failed to create lead',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};