import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuth } from '@/lib/google-auth';
import { google } from 'googleapis';

export async function POST(req: NextRequest) {
  try {
    const { action, messageIds, labelIds, addLabelIds, removeLabelIds } = await req.json();
    const auth = await getGoogleAuth(req);
    
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const gmail = google.gmail({ version: 'v1', auth });

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'messageIds is required' }, { status: 400 });
    }

    const modifyRequest = {
      ids: messageIds,
      addLabelIds: addLabelIds || [],
      removeLabelIds: removeLabelIds || [],
    };

    // Handle specific actions
    switch (action) {
      case 'markRead':
        modifyRequest.removeLabelIds.push('UNREAD');
        break;
      case 'markUnread':
        modifyRequest.addLabelIds.push('UNREAD');
        break;
      case 'archive':
        modifyRequest.removeLabelIds.push('INBOX');
        break;
      case 'moveToInbox':
        modifyRequest.addLabelIds.push('INBOX');
        break;
      case 'trash':
        // Use trash method instead of modify
        await gmail.users.messages.batchDelete({
          userId: 'me',
          requestBody: {
            ids: messageIds,
          },
        });
        return NextResponse.json({ success: true, message: 'Emails moved to trash' });
      default:
        // For generic label modifications
        break;
    }

    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: modifyRequest,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in email action:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
