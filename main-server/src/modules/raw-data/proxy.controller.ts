import { Controller, Get, Query, Res, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import axios from 'axios';

@ApiTags('Proxy')
@Controller('proxy')
export class ProxyController {
  @Get('image')
  async proxyImage(@Query('url') targetUrl: string, @Res() res: Response, @Req() req: Request) {
    if (!targetUrl) {
      return res.status(400).send('URL is required');
    }

    try {
      // Validate URL
      new URL(targetUrl);

      // Auto-sanitize Reddit preview links
      if (targetUrl.includes('preview.redd.it')) {
        try {
          const urlObj = new URL(targetUrl);
          targetUrl = `https://i.redd.it${urlObj.pathname}`;
        } catch {}
      }

      const response = await axios.get(targetUrl, {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': new URL(targetUrl).origin,
        },
        timeout: 10000,
        validateStatus: () => true 
      });

      if (response.status >= 400) {
        return res.status(response.status).send('Image fetch failed');
      }

      // Forward content type and cache headers
      if (response.headers['content-type']) {
        res.set('Content-Type', response.headers['content-type']);
      }
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day in user's browser

      // Pipe the image stream directly to the response
      response.data.pipe(res);
    } catch (err) {
      return res.status(500).send('Proxy error');
    }
  }
}
