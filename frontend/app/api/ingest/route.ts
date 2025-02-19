// app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf'];

async function bufferFile(file: File): Promise<Buffer> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer;
  } catch (error) {
    console.error('Error buffering file:', error);
    throw new Error('Failed to read file content.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        files.push(value);
      }
    }

    console.log('files', files);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate file count
    if (files.length > 5) {
      return NextResponse.json(
        { error: 'Too many files. Maximum 5 files allowed.' },
        { status: 400 },
      );
    }

    // Validate file types and sizes
    const invalidFiles = files.filter((file) => {
      return (
        !ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
      );
    });

    if (invalidFiles.length > 0) {
      return NextResponse.json(
        {
          error:
            'Only PDF files are allowed and file size must be less than 10MB',
        },
        { status: 400 },
      );
    }

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        try {
          const buffer = await bufferFile(file);

          // TODO: Implement your PDF processing logic here using the buffer
          // Example: Extract text, analyze content, etc.
          // You can use libraries like pdf-parse (install it if you need it)

          // const pdfData = await pdfParse(buffer);
          // const textContent = pdfData.text;

          return {
            filename: file.name,
            size: file.size,
            // textContent: textContent, // Example: include extracted text
          };
        } catch (processError: any) {
          console.error(`Error processing file ${file.name}:`, processError);
          return {
            filename: file.name,
            size: file.size,
            error: `Failed to process file: ${processError.message}`,
          };
        }
      }),
    );

    const successfulFiles = processedFiles.filter((file) => !file.error);
    const failedFiles = processedFiles.filter((file) => file.error);

    if (successfulFiles.length === 0 && failedFiles.length > 0) {
      return NextResponse.json(
        {
          message: `Failed to process all files. See details for each file.`,
          files: processedFiles,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: `Successfully processed ${successfulFiles.length} files. ${failedFiles.length} files failed.`,
      files: processedFiles,
    });
  } catch (error: any) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      { error: 'Failed to process files', details: error.message },
      { status: 500 },
    );
  }
}
