// script.js
document.addEventListener('DOMContentLoaded', function() {
  // Existing code for "See details" functionality
  const projectSections = document.querySelectorAll('.project-section');
  
  projectSections.forEach(section => {
    section.addEventListener('click', function(event) {
      // Check if the click originated from a link, button, or form input within the section
      if (event.target.closest('a') || event.target.closest('button') || event.target.closest('form')) {
        return;
      }
  
      // Prevent default action if the click is on an anchor without a valid href
      if (event.target.tagName.toLowerCase() === 'a' && event.target.getAttribute('href') === '#') {
        event.preventDefault();
      }
  
      // Find the corresponding project-content within the section
      const projectContent = this.querySelector('.project-content');
      if (!projectContent) return;
  
      // Find the more-content div within project-content
      const moreContent = projectContent.querySelector('.more-content');
      if (!moreContent) return;
  
      // Find the read-more link within the project-header
      const readMoreLink = this.querySelector('.read-more');
  
      // Toggle the display of more-content
      if (moreContent.style.display === 'block') {
        moreContent.style.display = 'none';
        if (readMoreLink) readMoreLink.textContent = 'See details';
        if (readMoreLink) readMoreLink.setAttribute('aria-label', 'Show project details');
      } else {
        moreContent.style.display = 'block';
        if (readMoreLink) readMoreLink.textContent = 'Hide details';
        if (readMoreLink) readMoreLink.setAttribute('aria-label', 'Hide project details');
      }
    });
  });
  
  // New code for form submission and validation
  const form = document.getElementById('zendesk-form');
  const messageDiv = document.getElementById('error-message'); // Reuse the same div for error and success messages

  form.addEventListener('submit', function(event) {
    event.preventDefault();

    // Clear previous messages
    messageDiv.textContent = '';
    messageDiv.style.display = 'none';
    messageDiv.classList.remove('success-message', 'error-message'); // Remove any previous classes

    // Validate subdomain
    const subdomainInput = document.getElementById('subdomain');
    const subdomain = subdomainInput.value.trim();

    if (!subdomain) {
      messageDiv.classList.add('error-message'); // Add error class
      showMessage('Enter a subdomain.', 5000); // Show error for empty subdomain
      return;
    }

    if (!isValidSubdomain(subdomain)) {
      messageDiv.classList.add('error-message'); // Add error class
      showMessage('Enter a valid subdomain.', 5000); // Show error for invalid subdomain
      return;
    }

    // Prepare form data
    const formData = 'subdomain=' + encodeURIComponent(subdomain);

    // Send AJAX request
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/process', true);
    xhr.responseType = 'blob'; // Expecting a file (CSV)
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    // Handle response
    xhr.onload = function() {
      // Clear the in-process message timeout if it hasn't been displayed yet
      clearTimeout(inProcessTimeout);

      // Remove in-process message if it exists
      const inProcessDiv = document.getElementById('in-process-message');
      if (inProcessDiv) {
        inProcessDiv.remove();
      }

      if (xhr.status === 200) {
        // Download the file
        const blob = xhr.response;
        const filename = 'zendesk_articles.csv';

        // Create a link to download the file
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);

        // Clear the form inputs
        form.reset();

        // Show success message
        messageDiv.classList.add('success-message');  // Add a class for styling success messages
        showMessage('Article management CSV downloaded!', 5000); // Success message
      } else {
        // Handle errors
        const reader = new FileReader();
        reader.onload = function() {
          const responseText = reader.result;

          // Display specific error messages based on status code
          let errorMsg = 'An error occurred.';
          if (xhr.status === 401) {
            errorMsg = 'This site requires authentication to access the API. Try another subdomain.';
          } else if (xhr.status === 404) {
            errorMsg = 'Zendesk couldn\'t find your subdomain. Check your spelling.';
          } else if (xhr.status === 400) {
            errorMsg = responseText || 'Invalid request.';
          } else if (xhr.status === 500) {
            errorMsg = 'Server error occurred.';
          }

          messageDiv.classList.add('error-message'); // Add error class
          showMessage(errorMsg, 5000); // Show error message
        };
        reader.readAsText(xhr.response);
      }
    };

    // Handle network errors
    xhr.onerror = function() {
      // Clear the in-process message timeout if it hasn't been displayed yet
      clearTimeout(inProcessTimeout);

      // Remove in-process message if it exists
      const inProcessDiv = document.getElementById('in-process-message');
      if (inProcessDiv) {
        inProcessDiv.remove();
      }

      messageDiv.classList.add('error-message'); // Add error class
      showMessage('An error occurred during the request.', 5000); // Show network error
    };

    // Handle cancellation
    function abortRequest() {
      xhr.abort();
      clearTimeout(inProcessTimeout);
      const inProcessDiv = document.getElementById('in-process-message');
      if (inProcessDiv) {
        inProcessDiv.remove();
      }
      messageDiv.classList.add('error-message'); // Add error class
      showMessage('Download canceled.', 5000); // Show cancellation message
    }

    // Set a timeout to display the in-process message after a short delay
    const inProcessTimeout = setTimeout(function() {
      // Show in-process message with interrupt option
      const inProcessDiv = document.createElement('div');
      inProcessDiv.id = 'in-process-message';
      inProcessDiv.innerHTML = 'Downloading your article management CSV... <a id="cancel-button">Cancel</a>';
      form.appendChild(inProcessDiv);

      const cancelButton = document.getElementById('cancel-button');
      cancelButton.addEventListener('click', abortRequest);
    }, 500); // Delay of 500 milliseconds

    // Send the request
    xhr.send(formData);
  });

  // Function to validate the subdomain format
  function isValidSubdomain(subdomain) {
    // Subdomain must be alphanumeric, can include hyphens, start and end with alphanumeric
    const subdomainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    return subdomainPattern.test(subdomain);
  }

  // Function to display messages with a custom timeout
  function showMessage(message, timeout = 5000) {
    // Remove in-process message if it exists
    const inProcessDiv = document.getElementById('in-process-message');
    if (inProcessDiv) {
      inProcessDiv.remove();
    }

    messageDiv.textContent = message;
    messageDiv.style.display = 'block';

    // Clear the form inputs without resetting the page
    form.reset();

    // Set a timeout to hide the message after the specified time
    setTimeout(function() {
      messageDiv.style.display = 'none';
      messageDiv.classList.remove('success-message', 'error-message'); // Remove classes after timeout
    }, timeout);
  }
});
