// CloudFront Function: route PR preview subdomains to S3 prefix.
// Host: myworld-pr-{N}.ernestwwchin.com → S3 key prefix: /pr/{N}/
function handler(event) {
  var request = event.request;
  var host = (request.headers.host && request.headers.host.value) || '';

  // Match myworld-pr-{number}.ernestwwchin.com
  var match = host.match(/^myworld-pr-(\d+)\./);
  if (match) {
    var prNum = match[1];
    var uri = request.uri;

    // Default to index.html for root
    if (uri === '/' || uri === '') {
      uri = '/index.html';
    }

    request.uri = '/pr/' + prNum + uri;
  }

  return request;
}
