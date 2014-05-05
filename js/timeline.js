document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.getBackgroundPage(function(window) {
        var pisces = window.pisces;

        $("#user_id").text(pisces.agent.config.userId);

        $("#send_button").click(function() {
            pisces.agent.sendMessage($("#message").val());
        });

        pisces.agent.listeners.onMessage = function(message) {
            $("#received").text(message);
        }
    });
});

