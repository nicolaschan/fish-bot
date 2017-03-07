const async = require('async');
const config = require('./config.json');
var math = require('mathjs');
var mineflayer = require('mineflayer');
var navigatePlugin = require('mineflayer-navigate')(mineflayer);
var v = require('vec3');

var initializeBot = function() {
  var bot = mineflayer.createBot(config.login);
  navigatePlugin(bot);

  bot.navigate.on('pathFound', function(path) {
    bot.chat(`Routed! ${path.length} moves to destination`);
  });
  bot.navigate.on('cannotFind', function(closestPath) {
    bot.chat('Cannot route to destination');
  });
  bot.navigate.on('arrived', function() {
    bot.chat(`Arrived at ${JSON.stringify(bot.entity.position)}`);
  });
  bot.navigate.on('interrupted', function() {
    bot.chat(`Stopped at ${JSON.stringify(bot.entity.position)}`);
  });

  var fishing = false;
  var fish = function() {
    if (!fishing) return;
    bot.activateItem();
    setTimeout(function() {
      var active = true;
      bot.on('entityMoved', function(entity) {
        if (!active) return;
        if (entity.objectType == 'Fishing Hook' && Math.abs(entity.velocity.y) > 0.1) {
          bot.activateItem();
          active = false;
          fish();
        }
      });
    }, 2000);
  };

  bot.on('chat', function(username, message) {
    if (username == bot.username) return;

    try {
      var result = math.eval(message);
      if (result != null && result != undefined)
        bot.chat(result + '');
    } catch (e) {}

    if (message.substring(0, config.prefix.length) != config.prefix) return;

    var args = message.split(' ');
    var command = args[1].toLowerCase();
    switch (command) {
      case 'disconnect':
        bot.quit();
        break;
      case 'drop':
        try {
          bot.toss(parseInt(args[2]), null, (args[3]) ? parseInt(args[3]) : 1, function(err) {
            if (!err)
              bot.chat('Successfully tossed');
            else
              bot.chat(err.message);
          });
        } catch (e) {
          bot.chat('Invalid arguments');
        }
        break;
      case 'dump':
        var inventory = bot.inventory.slots;
        var items = [];
        for (var item in inventory) {
          if (!inventory[item]) continue;
          items.push({
            type: inventory[item].type,
            count: inventory[item].count
          });
        }
        bot.chat(`Dumping all ${items.length} item types`);
        async.forEachSeries(items, function(item, callback) {
          bot.toss(item.type, null, item.count, function(err) {
            if (err) console.log(err);
            callback();
          });
        });
        break;
      case 'equip':
        var slot = (['hand', 'head', 'torso', 'legs', 'feed'].indexOf(args[3]) < 0) ? 'hand' : args[3];
        bot.equip(bot.inventory.slots[parseInt(args[2])], slot, function(err) {
          if (!err) bot.chat('Successfully equipped');
          else bot.chat(err.message);
        })
      case 'experience':
        bot.chat('Experience level: ' + bot.experience.level);
        break;
      case 'fish':
        var startFishing = function() {
          fishing = true;
          fish();
          bot.chat('Started fishing');
        };
        var stopFishing = function() {
          fishing = false;
          bot.activateItem();
          bot.chat('Stopped fishing');
        };
        var toggleFishing = function() {
          if (!fishing) startFishing();
          else stopFishing();
        };

        if (args[2] == 'start') startFishing();
        else if (args[2] == 'stop') stopFishing();
        else toggleFishing();

        break;
      case 'food':
        bot.chat('Food: ' + bot.food + '/20');
        break;
      case 'health':
        bot.chat('Health: ' + bot.health + '/20');
        break;
      case 'help':
        bot.chat('Available commands: [ disconnect, drop, dump, equip, experience, fish, food, health, help, inventory, item.activate, item.deactivate, locate, look, ping route.to, route.stop ]')
        break;
      case 'inventory':
        bot.chat(JSON.stringify(bot.inventory));
        break;
      case 'item.activate':
        bot.activateItem();
        break;
      case 'item.deactivate':
        bot.deactivateItem();
        break;
      case 'locate':
        bot.chat(`Location: ${JSON.stringify(bot.entity.position)}`);
        break;
      case 'look':
        var dir = {
          yaw: parseFloat(args[2]),
          pitch: parseFloat(args[3])
        };
        if (dir.yaw == null || dir.pitch == null || isNaN(dir.yaw) || isNaN(dir.pitch))
          return bot.chat('Invalid arguments');
        bot.look(dir.yaw, dir.pitch, true, function() {
          bot.chat(`Now looking at ${JSON.stringify(dir)}`);
        });
        break;
      case 'ping':
        bot.chat('Pong!');
        break;
      case 'route.to':
        if (args[2] == 'me' || args[2] == 'here') {
          var target = bot.players[username].entity;
          bot.navigate.to(target.position);
          break;
        } else {
          var dest = {
            x: parseFloat(args[2]),
            y: parseFloat(args[3]),
            z: parseFloat(args[4])
          };
          if (dest.x == null || dest.y == null || dest.z == null || isNaN(dest.x) || isNaN(dest.y) || isNaN(dest.z))
            return bot.chat('Invalid arguments');
          bot.navigate.to(v(dest.x, dest.y, dest.z));
          break;
        }
      case 'route.stop':
        bot.navigate.stop();
        break;
      default:
        bot.chat('Unknown command');
    }
  });

  bot.on('spawn', function() {
    bot.chat('Ready! I\'m a bot.');
  });

  bot.on('end', function() {
    initializeBot();
  });
};
initializeBot();