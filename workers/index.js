import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'

/**
 * This is a downstream, modified version of the following repo:
 * https://github.com/cloudflare/worker-sites-template
 * 
 * Some changes of note are:
 * 1. DEBUG flag has been removed in favor of always-on verbose errors since:
 *      a. There is no sensitive content on this site. Not even an API.
 *      b. Cache purges are easier to execute in the Cloudflare Dashboard.
 * 2. The addition of defaultCacheControl() which loosely sets max-age values
 *    based on the content expected for a given fetch, which also feeds into...
 * 3. The addition of createResponseWithHeaders() which adds browser-side cache
 *    directives and security headers to 200 & 404 responses, setting some
 *    useless-to-us headers such as:
 *      a. XSS Protection, despite a general lack of JS on this site.
 *      b. Content Type Options, despite no dynamic/user-uploaded content.
 *      c. Frame Options, so you need to clone this repo instead of framing it.
 *    ... and a couple actually useful ones:
 *      d. Referrer Policy so only secure sites can know where you came from.
 *      e. Content Security Policy, to prevent external resources loading.
 *    Why? Because anything less than an A grade on https://securityheaders.io
 *    is sacrilege. ;)
 */

addEventListener('fetch', event => {
  try {
    event.respondWith(handleEvent(event))
  } catch (e) {
    return event.respondWith(
      new Response(e.message || e.toString(), {
        status: 500,
      }),
    )
  }
})

async function handleEvent(event) {
  let options = {}

  try {
    const page = await getAssetFromKV(event, options)
    const cache = setDefaultCacheControl(event.request.url.split(".").pop());
    return createResponseWithHeaders(page.body, page, cache)
  } catch (e) {
    // if an error is thrown try to serve the asset at 404.html
    try {
      let notFoundResponse = await getAssetFromKV(event, {
        mapRequestToAsset: req => new Request(
          `${new URL(req.url).origin}/404.html`,
          req
        ),
      })

      return createResponseWithHeaders(
        notFoundResponse.body, 
        { ...notFoundResponse, status: 404 },
        "max-age=5" // cache 404s for five seconds
      )
    } catch (e) {}

    return new Response(e.message || e.toString(), { status: 500 })
  }
}

function setDefaultCacheControl(extension) {
  switch(extension) {
    /* TWO WEEK CACHE
     * For: icons, js, css
     * Changes: unlikely
     */
    case "ico":
      return "max-age=1209600"
    case "css":
      return "max-age=1209600"
    case "js":
      return "max-age=1209600"

    /* FIVE MINUTE CACHE
     * For: no trailing extension, html, xml, txt, json, everything else
     * Changes: frequently/unknown
     */
    default:
      return "max-age=300"
  }
}

function createResponseWithHeaders(body, page, cache) {
  // make a header-mutable response
  const response = new Response(body, page)

  // performance headers
  response.headers.set("Cache-Control", cache);

  // security headers
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Content-Security-Policy', 'default-src https://unique-local-ipv6.com:443 https://www.unique-local-ipv6.com:443; frame-ancestors \'none\'')
  response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade')

  return response
}