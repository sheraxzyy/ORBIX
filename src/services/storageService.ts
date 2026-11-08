import { supabase } from '@/lib/supabase';

export const storageService = {
  async uploadAttachment(
    conversationId: string,
    file: File
  ): Promise<{ path: string; name: string; size: number; mimeType: string }> {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `attachments/${conversationId}/${crypto.randomUUID()}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    return {
      path: filePath,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    };
  },

  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  },
};

