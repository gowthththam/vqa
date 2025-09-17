interface FileUploadData {
    filename: string;
    content: string;
    type: string;
  }
  
  class AzureBlobStorageService {
    private accountName: string;
    private containerName: string;
    private sasToken: string;
    private sasUrl: string;
  
    constructor() {
        this.accountName = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME;
        this.containerName = import.meta.env.VITE_AZURE_STORAGE_CONTAINER_NAME;
        this.sasToken = import.meta.env.VITE_AZURE_STORAGE_SAS_TOKEN;
        this.validateConfig();
      }
      
  
    private validateConfig(): void {
      const requiredVars = [
        'VITE_AZURE_STORAGE_ACCOUNT_NAME',
        'VITE_AZURE_STORAGE_CONTAINER_NAME',
        'VITE_AZURE_STORAGE_SAS_TOKEN'
      ];
  
      const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }
    }
  
    async uploadFile(fileData: FileUploadData): Promise<string> {
        try {
          // Decode base64 content
          const binaryContent = atob(fileData.content);
          const bytes = new Uint8Array(binaryContent.length);
          for (let i = 0; i < binaryContent.length; i++) {
            bytes[i] = binaryContent.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: fileData.type });
          
          // Create unique filename with timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const uniqueFilename = `${timestamp}_${fileData.filename}`;
          
          // ✅ CORRECT URL CONSTRUCTION
          const blobUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${uniqueFilename}?${this.sasToken}`;
          
          console.log(`Uploading to: ${blobUrl}`);
          
          const response = await fetch(blobUrl, {
            method: 'PUT',
            headers: {
              'x-ms-blob-type': 'BlockBlob',
              'Content-Type': fileData.type,
              'x-ms-meta-originalname': fileData.filename,
              'x-ms-meta-uploadtime': new Date().toISOString()
            },
            body: blob
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
          }
          
          // Return the public URL (without SAS token)
          const publicUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${uniqueFilename}`;
          console.log(`File ${fileData.filename} uploaded successfully to: ${publicUrl}`);
          return publicUrl;
          
        } catch (error) {
          console.error(`Error uploading ${fileData.filename} to Azure Blob Storage:`, error);
          throw error;
        }
      }
      
  
    async uploadFiles(files: FileUploadData[]): Promise<string[]> {
      const uploadPromises = files.map(file => this.uploadFile(file));
      try {
        const fileUrls = await Promise.all(uploadPromises);
        return fileUrls;
      } catch (error) {
        console.error('Error uploading files to Azure Blob Storage:', error);
        throw error;
      }
    }
  
    // Optional: Method to delete a file (if your SAS token has delete permissions)
    async deleteFile(filename: string): Promise<void> {
      try {
        let deleteUrl: string;
        if (this.sasUrl) {
          deleteUrl = `${this.sasUrl}/${filename}`;
        } else {
          deleteUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${filename}?${this.sasToken}`;
        }
  
        const response = await fetch(deleteUrl, {
          method: 'DELETE'
        });
  
        if (!response.ok) {
          throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
        }
  
        console.log(`File ${filename} deleted from Azure Blob Storage`);
      } catch (error) {
        console.error(`Error deleting ${filename} from Azure Blob Storage:`, error);
        throw error;
      }
    }
  
    // Optional: Method to list files (if your SAS token has list permissions)
    async listFiles(): Promise<string[]> {
      try {
        let listUrl: string;
        if (this.sasUrl) {
          listUrl = `${this.sasUrl}?restype=container&comp=list`;
        } else {
          listUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}?restype=container&comp=list&${this.sasToken}`;
        }
  
        const response = await fetch(listUrl);
        
        if (!response.ok) {
          throw new Error(`List failed: ${response.status} ${response.statusText}`);
        }
  
        const xmlText = await response.text();
        
        // Parse XML response to extract blob names
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const blobs = xmlDoc.querySelectorAll('Blob Name');
        
        return Array.from(blobs).map(blob => blob.textContent || '');
      } catch (error) {
        console.error('Error listing files from Azure Blob Storage:', error);
        throw error;
      }
    }
  }
  
  export const azureBlobStorageService = new AzureBlobStorageService();
  