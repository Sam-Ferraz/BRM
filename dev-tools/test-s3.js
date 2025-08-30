import { S3Client, CreateBucketCommand, HeadBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'

dotenv.config()

const bucketName = process.env.AWS_S3_BUCKET || 'sa1-brm-data'

const clientConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
  }
}

if (process.env.S3_ENDPOINT) {
  clientConfig.endpoint = process.env.S3_ENDPOINT
  clientConfig.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'
}

const s3Client = new S3Client(clientConfig)

async function testS3Connection() {
  try {
    console.log('Testing S3/MinIO connection...')
    console.log('Bucket name:', bucketName)
    console.log('Endpoint:', process.env.S3_ENDPOINT)
    
    // List all buckets
    console.log('\n1. Listing all buckets...')
    const listCommand = new ListBucketsCommand({})
    const listResult = await s3Client.send(listCommand)
    console.log('Available buckets:', listResult.Buckets.map(b => b.Name))
    
    // Check if our bucket exists
    console.log('\n2. Checking if bucket exists...')
    try {
      const headCommand = new HeadBucketCommand({ Bucket: bucketName })
      await s3Client.send(headCommand)
      console.log(`✅ Bucket '${bucketName}' exists and is accessible`)
    } catch (error) {
      if (error.name === 'NoSuchBucket' || error.name === 'NotFound') {
        console.log(`❌ Bucket '${bucketName}' does not exist`)
        
        // Create the bucket
        console.log('\n3. Creating bucket...')
        const createCommand = new CreateBucketCommand({ Bucket: bucketName })
        await s3Client.send(createCommand)
        console.log(`✅ Bucket '${bucketName}' created successfully`)
      } else {
        throw error
      }
    }
    
    console.log('\n✅ S3/MinIO setup is working correctly!')
    
  } catch (error) {
    console.error('❌ S3/MinIO connection failed:', error.message)
    process.exit(1)
  }
}

testS3Connection()