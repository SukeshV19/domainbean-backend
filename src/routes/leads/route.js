
import payload from 'payload';

export const GET = async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    const userDomains = await payload.find({
      collection: 'domains',
      where: {
        ownedBy: {
          equals: userId
        }
      },
      limit: 1000
    });

    const domainIds = userDomains.docs.map(domain => domain.id);
    
    console.log('=== LEADS ROUTE DEBUG ===');
    console.log('User ID:', userId);
    console.log('User owns domains:', domainIds.length, 'domains');
    console.log('Domain IDs:', domainIds);

    // Build the OR conditions array
    const orConditions = [];
    
    // Add condition for leads where user owns the domain
    if (domainIds.length > 0) {
      orConditions.push({ domainId: { in: domainIds } });
    }
    
    // Always add condition for leads where user is the buyer
    orConditions.push({ buyerId: { equals: userId } });
    
    console.log('OR Conditions:', JSON.stringify(orConditions, null, 2));

    const leads = await payload.find({
      collection: 'leads',
      where: {
        or: orConditions
      },
      depth: 3, 
      limit: 100,
      sort: '-createdAt'
    });
    
    console.log('Found leads:', leads.docs.length);
    console.log('Lead details:', leads.docs.map(lead => ({
      id: lead.id,
      buyerId: lead.buyerId,
      domainId: lead.domainId,
      domainOwner: lead.domainId?.ownedBy
    })));

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

export const POST = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    const { buyerId, domainId, type, status, message } = req.body;

    if (!buyerId || !domainId) {
      return res.status(400).json({ 
        error: 'buyerId and domainId are required' 
      });
    }
    
    const leadData = {
      buyerId,
      domainId,
      type: type || 'Offer',
      status: status || 'Accepted',
      chats: message ? [{
        userId: buyerId,
        message: message
      }] : []
    };

    const lead = await payload.create({
      collection: 'leads',
      data: leadData
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

export const PUT = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    const { leadId, userId, message } = req.body;

    // Validate required fields
    if (!leadId || !userId || !message) {
      return res.status(400).json({ 
        error: 'leadId, userId, and message are required' 
      });
    }

    // Get the lead
    const lead = await payload.findByID({
      collection: 'leads',
      id: leadId,
      depth: 1
    });

    if (!lead) {
      return res.status(404).json({ 
        error: 'Lead not found' 
      });
    }

    // Add new message to existing chats array
    const updatedChats = [
      ...(lead.chats || []),
      {
        userId,
        message
      }
    ];

    // Update lead with new chat message
    const updatedLead = await payload.update({
      collection: 'leads',
      id: leadId,
      data: {
        chats: updatedChats
      }
    });

    return res.status(200).json({
      message: 'Message added successfully',
      lead: updatedLead
    });

  } catch (error) {
    console.error('Error adding message:', error);
    return res.status(500).json({ 
      error: 'Failed to add message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};