// Cloudflare Worker entrypoint template. Not wired to Pages, not deployed,
// and provider adapters are deliberately absent until owner approval.
// A future authenticated, licensed upstream adapter can be injected after review.
import {handleApiRequest} from './api.mjs';
export default {
  async fetch(request,env){
    return handleApiRequest(request,{...env,RUNTIME_MODE:'cloudflare'});
  }
};
