(function (window, document) {
  "use strict";

  var projectId = "zjvhmkh7zd";
  var clarity = window.clarity = window.clarity || function () {
    (clarity.q = clarity.q || []).push(arguments);
  };
  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.clarity.ms/tag/" + projectId;

  var firstScript = document.getElementsByTagName("script")[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
})(window, document);
