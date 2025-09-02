import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { sendOutbidNotification, sendDomainSoldNotification } from '@/lib/notifications.js'

function convertToMonths(interval) {
  switch (interval) {
    case "1 month": return 1;
    case "3 months": return 3;
    case "6 months": return 6;
    case "1 year": return 12;
    case "2 years": return 24;
    case "3 years": return 36;
    case "4 years": return 48;
    case "5 years": return 60;
    default: throw new Error(`Unknown interval: ${interval}`);
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export const OPTIONS = async (_request) => {
  return new Response(null, {
    status: 200,
    headers: {
      ...corsHeaders(),
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  })
}

export const POST = async (request) => {
  try {
    const payload = await getPayload({ config: configPromise })

    const authUser = await payload.auth({ headers: request.headers })
    if (!authUser || !authUser.user) {
      return Response.json(
        { message: 'Unauthorized: User not authenticated.' },
        { status: 401, headers: corsHeaders() }
      )
    }
    const user = authUser.user

    let body
    try {
      body = await request.json()
    } catch {
      return Response.json(
        { message: 'Invalid JSON body: Request body could not be parsed as JSON.' },
        { status: 400, headers: corsHeaders() }
      )
    }
    const { domains = [], installmentDomains = [], installmentsDetails = {} } = body
    console.log(domains,installmentDomains,installmentsDetails)

    if (!Array.isArray(domains) || !Array.isArray(installmentDomains)) {
      return Response.json(
        { message: 'Invalid request: `domains` and `installmentDomains` must be arrays.' },
        { status: 400, headers: corsHeaders() }
      )
    }

    const salesCreated = [] 
    const pendingSalesToRegister = [] 

    for (const domainId of domains) {
      try {
        const domainInfo = await payload.findByID({collection: 'domains',id: domainId,})

        if (!domainInfo) {
          console.error(`Error: Domain not found for normal sale (ID: ${domainId}).`)
          return Response.json(
            { message: `Sale failed: Domain ${domainId} not found for normal sale.` },
            { status: 400, headers: corsHeaders() }
          )
        }
        if (domainInfo.ownedBy === user.id) {
          console.error(`Error: User ${user.id} tried to buy domain ${domainId} which they already own.`)
          return Response.json(
            { message: `Sale failed: Cannot buy domain ${domainId} you already own.` },
            { status: 400, headers: corsHeaders() }
          )
        }

        // Store original owner before updating
        const originalOwner = domainInfo.ownedBy

        await payload.update({collection: 'domains',id: domainId,data: { ownedBy: user.id, status: 'sold' }})

        // Send domain sold notification to original owner
        try {
          if (originalOwner) {
            const ownerId = typeof originalOwner === 'object' ? originalOwner.id : originalOwner;
            console.log(`[SALE_ROUTE] Sending domain sold notification - ownerId: ${ownerId}, buyer: ${user.name || user.email}, domain: ${domainInfo.name}, price: ${domainInfo.price}`);
            await sendDomainSoldNotification(
              ownerId,
              user.name || user.email,
              domainInfo.name,
              domainInfo.price
            )
            console.log(`[SALE_ROUTE] Domain sold notification sent successfully for domain ${domainId}`);
          } else {
            console.log(`[SALE_ROUTE] No original owner found for domain ${domainId}, skipping notification`);
          }
        } catch (notificationError) {
          console.error(`[SALE_ROUTE] Error sending domain sold notification for domain ${domainId}:`, notificationError)
        }

        salesCreated.push(domainId) 

        pendingSalesToRegister.push({
          domainId: domainId,
          sellerId: domainInfo.ownedBy,
          buyerId: user.id,
          price: domainInfo.price ? domainInfo.price.toString() : '0',
          type: 'full'
        })
      } catch (err) {
        console.error(`Error processing normal sale for domain ${domainId}:`, err)
        return Response.json(
          { message: `Sale failed: Failed to complete normal sale for domain ${domainId}. Error: ${err.message}` },
          { status: 400, headers: corsHeaders() }
        )
      }
    }

    for (const domain of installmentDomains) {
      const installmentDetails = installmentsDetails[domain.id]
      if (!installmentDetails) {
        console.error(`Error: Missing installment details for domain ${domain.id}.`)
        return Response.json(
          { message: `Sale failed: Missing installment details for domain ${domain.id}.` },
          { status: 400, headers: corsHeaders() }
        )
      }

      try {
        // Fetch domain details to get the current owner (seller) and verify existence.
        const domainInfo = await payload.findByID({
          collection: 'domains',
          id: domain.id
        })

        if (!domainInfo) {
          console.error(`Error: Domain not found for installment sale (ID: ${domain.id}).`)
          return Response.json(
            { message: `Sale failed: Domain ${domain.id} not found for installment sale.` },
            { status: 400, headers: corsHeaders() }
          )
        }
        // Ensure that the domain is not already owned by the current user or already sold.
        if (domainInfo.ownedBy === user.id) {
          console.error(`Error: User ${user.id} tried to buy domain ${domain.id} on installment which they already own.`)
          return Response.json(
            { message: `Sale failed: Cannot buy domain ${domain.id} you already own on installment.` },
            { status: 400, headers: corsHeaders() }
          )
        }

        // Store original owner before updating
        const originalOwner = domainInfo.ownedBy

        const installment = await payload.create({
          collection: 'installments',
          data: {
            domainId: domain.id,
            buyerId: user.id,
            sellerId: domainInfo.ownedBy,
            totalTime: installmentDetails.timeLimit,
            interval: installmentDetails.interval,   
            installmentPrice: installmentDetails.installmentPrice,
            nextInstallmentDate: new Date(
              new Date().setMonth(new Date().getMonth() + convertToMonths(installmentDetails.interval))
            ),
            history: [{ paymentDate: new Date() }], 
          }
        })

        await payload.update({
          collection: 'domains',
          id: domain.id,
          data: {
            ownedBy: user.id,
            status: 'installment',
            installmentPlan: installment.id 
          }
        })

        // Send domain sold notification to original owner
        try {
          if (originalOwner) {
            const ownerId = typeof originalOwner === 'object' ? originalOwner.id : originalOwner;
            console.log(`[SALE_ROUTE] Sending installment domain sold notification - ownerId: ${ownerId}, buyer: ${user.name || user.email}, domain: ${domainInfo.name}, price: ${installmentDetails.installmentPrice}`);
            await sendDomainSoldNotification(
              ownerId,
              user.name || user.email,
              domainInfo.name,
              installmentDetails.installmentPrice
            )
            console.log(`[SALE_ROUTE] Installment domain sold notification sent successfully for domain ${domain.id}`);
          } else {
            console.log(`[SALE_ROUTE] No original owner found for installment domain ${domain.id}, skipping notification`);
          }
        } catch (notificationError) {
          console.error(`[SALE_ROUTE] Error sending domain sold notification for installment domain ${domain.id}:`, notificationError)
        }

        salesCreated.push(domain.id)
        pendingSalesToRegister.push({
          domainId: domain.id,
          sellerId: domainInfo.ownedBy,
          buyerId: user.id,
          price: installmentDetails.installmentPrice.toString(),
          type: 'installment'
        })

      } catch (err) {
        console.error(`Error processing installment sale for domain ${domain.id}:`, err)
        return Response.json(
          { message: `Sale failed: Failed to create installment plan or update domain ${domain.id}. Error: ${err.message}` },
          { status: 400, headers: corsHeaders() }
        )
      }
    }

    try {
      const cart = await payload.find({
        collection: 'cart',
        where: { user: { equals: user.id } }
      })

      if (cart.docs.length > 0) {
        await payload.delete({
          collection: 'cart',
          id: cart.docs[0].id
        })
      }
    } catch (err) {
      console.error(`Warning: Error clearing cart for user ${user.id}:`, err)
    }

    for (const saleData of pendingSalesToRegister) {
      try {
        await payload.create({
          collection: 'sales',
          data: saleData
        })
      } catch (err) {
        console.error(`Critical Error: Failed to register sale for domain ${saleData.domainId} in 'sales' table:`, err)
        return Response.json(
          {
            message: 'Sale completed for domains, but failed to record in sales table. Please contact support.',
            salesCompleted: salesCreated.length,
            totalDomains: domains.length + installmentDomains.length,
            sales: salesCreated,
            error: `Failed to register sale record for domain ${saleData.domainId}: ${err.message}`
          },
          { status: 500, headers: corsHeaders() } 
        )
      }
    }

    return Response.json(
      {
        message: 'Sale completed successfully for all items and registered.',
        salesCompleted: salesCreated.length,
        totalDomains: domains.length + installmentDomains.length,
        sales: salesCreated,
      },
      { status: 200, headers: corsHeaders() } // Return 200 OK for full success
    )

  } catch (err) {
    // Catch any unexpected errors that occur outside the specific processing loops.
    console.error('Sale API Internal Server Error:', err)
    return Response.json(
      { message: `Internal server error: An unexpected error occurred: ${err.message || err}` },
      { status: 500, headers: corsHeaders() }
    )
  }
}