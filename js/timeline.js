document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.getBackgroundPage(function(window) {

        pisces.agent.sendHello();

        $("#user_id").text(pisces.agent.config.userId);
        $("#username").attr("value", pisces.agent.config.username);
        $("#username").change(function() {
            chrome.storage.local.set({'username' : $("#username").val()});
        });

        $("#send_button").click(function() {
            pisces.agent.sendMessage($("#message").val(), function(result, info) {
                console.log("message sent. " + JSON.stringify(info));
            });
        });

        function updateParticipants() {
            var rows = "";
            for (var id in pisces.agent.participants) {
                var user = pisces.agent.participants[id];
                rows += "<tr><td>" + user.id + "</td><td>" + user.username + "</td></tr>\n";
            }
            $("#participants tbody").html(rows);
        }
        pisces.agent.listeners.onHello = function(info) {
            updateParticipants();
        };
        pisces.agent.listeners.onBye = function(info) {
            updateParticipants();
        }
        pisces.agent.listeners.onMessage = function(message) {
            $("#received").text(message);
        };
    });
});

