import fetch from 'node-fetch'

async function testProductsAPI() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@brm.com',
        password: 'admin123'
      })
    })

    const loginData = await loginResponse.json()
    const token = loginData.token

    // Fetch products
    const productsResponse = await fetch('http://localhost:3001/api/products', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const productsData = await productsResponse.json()
    
    console.log('Products API Response:')
    console.log('Total products:', productsData.total)
    console.log('\nFirst few products:')
    productsData.data.slice(0, 3).forEach(product => {
      console.log(`- ${product.name}: has_thumbnail = ${product.has_thumbnail}`)
    })

  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

testProductsAPI()