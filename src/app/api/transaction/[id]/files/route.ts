import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Temporary file storage without database until Prisma is regenerated
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'transactions', params.id)
    
    if (!existsSync(uploadsDir)) {
      return NextResponse.json([])
    }

    const files = await readdir(uploadsDir)
    const fileList = files
      .filter(file => file !== '.gitkeep')
      .map(file => {
        const filePath = join(uploadsDir, file)
        const stats = require('fs').statSync(filePath)
        const [timestamp, ...nameParts] = file.split('-')
        const originalName = nameParts.join('-')
        
        return {
          id: file,
          fileName: file,
          originalName: originalName || file,
          fileSize: stats.size,
          mimeType: getMimeType(file),
          filePath: `/uploads/transactions/${params.id}/${file}`,
          uploadedAt: new Date(parseInt(timestamp) || stats.birthtime).toISOString()
        }
      })
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    return NextResponse.json(fileList)
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Create transaction-specific uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'transactions', params.id)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${cleanName}`
    const filePath = join(uploadsDir, fileName)
    const publicPath = `/uploads/transactions/${params.id}/${fileName}`

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Return file info
    const fileRecord = {
      id: fileName,
      fileName,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      filePath: publicPath,
      uploadedAt: new Date().toISOString()
    }

    return NextResponse.json(fileRecord)
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Failed to upload file', details: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }

    // Delete physical file
    const filePath = join(process.cwd(), 'public', 'uploads', 'transactions', params.id, fileId)
    
    if (existsSync(filePath)) {
      await unlink(filePath)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp'
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}