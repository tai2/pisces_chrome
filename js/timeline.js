document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.getBackgroundPage(function(window) {

        pisces.agent.sendHello();

        $("#user_id").text(pisces.agent.config.userId);
        $("#username").text(pisces.agent.config.username);

        $("#send_button").click(function() {
            pisces.agent.sendMessage($("#message").val());
        });

        pisces.agent.listeners.onHello = function(senderId, iconHash, username) {
            $("#participants tbody").append("<tr><td>" + senderId + "</td><td>" + username + "</td></tr>");
        };
        pisces.agent.listeners.onMessage = function(message) {
            $("#received").text(message);
        };
    });
});

