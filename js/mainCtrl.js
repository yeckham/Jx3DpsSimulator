app.controller('MainCtrl', ['$scope','$rootScope','$timeout','$interval','Utils','Buff','Skill','$http','hotkeys', function($scope,$rootScope,$timeout,$interval,Utils,Buff,Skill,$http,hotkeys){
	$rootScope.buffController = {
		selfBuffs:{},
		targetBuffs:{}
	};
	$rootScope.macroMode = false;
	$rootScope.$watch('macroMode',function(){
		if(!$rootScope.macroMode) $rootScope.debug=true;
	});
	$rootScope.maxTime = 3.5;
	$rootScope.maxLoop = 1;
	
	$scope.digest = function(){
		if($rootScope.macroMode&&$rootScope.time%(Math.ceil($rootScope.myself.attributes.delay/1000*16)+1)===0){
			$scope.macro();
		}
		// 读条 时间控制
		if($rootScope.myself.states.ota){
			$rootScope.myself.states.otaRemain--;
			var skill = $rootScope.skillController.curSkill;
			if($rootScope.myself.states.otaRemain<=0){
				$rootScope.myself.states.curOta = 0;
				$rootScope.myself.states.ota = false;
				skill.calc($rootScope.myself,$rootScope.target,$rootScope.buffController,$rootScope.skillRecipe,$rootScope.skillOption);
				skill.onSkillFinish($rootScope.myself,$rootScope.target,$rootScope.buffController,$rootScope.skillRecipe,$rootScope.skillOption);
			}else if(skill.type=="channel"){
				if(($rootScope.myself.states.curOta-$rootScope.myself.states.otaRemain)%$rootScope.myself.states.curInterval===0){
					skill.calc($rootScope.myself,$rootScope.target,$rootScope.buffController,$rootScope.skillRecipe,$rootScope.skillOption);
				}
			}
		}
		// 公共CD 时间控制
		if($rootScope.myself.states.gcd>0){
			$rootScope.myself.states.gcd--;
		}
		// 技能CD 时间控制
		angular.forEach($rootScope.skillController.list,function(value,key){
			if(value.cdRemain>0){
				value.cdRemain--;
				this[key] = value;
			}
			if(value.cdRemain<0){
				value.cdRemain=0;
				this[key] = value;
			}
		},$rootScope.skillController.list);
		// buff 时间控制
		angular.forEach($rootScope.buffController.targetBuffs,function(value,key){
			value.remain--;
			this[key] = value;
			if((value.duration - value.remain)%value.interval===0&&value.type=="dot"){
				value.calc($rootScope.myself,$rootScope.target,$rootScope.buffController,1,$rootScope.skillRecipe,$rootScope.skillOption);
			}
			if(value.remain<=0){
				delete this[key];
			}
		},$rootScope.buffController.targetBuffs);
		$rootScope.myself.extra = {
			damage:0,
			attackAddPercent:0,
			attackAddBase:0,
			critAddPercent:0,
			critAddBase:0,
			hitAddPercent:0,
			hitAddBase:0,
			critEffAddPercent:0,
			critEffAddBase:0,
			overcomeAddPercent:0,
			overcomeAddBase:0,
			strainAddPercent:0,
			strainAddBase:0,
			haste:0
		};
		angular.forEach($rootScope.buffController.targetBuffs,function(value,key){
			if(value.type == "buff"){
				angular.forEach(value.data,function(buffNumber,index){
					$rootScope.myself.extra[index]+=buffNumber*value.level;
				});
			}
		},$rootScope.buffController.targetBuffs);
		angular.forEach($rootScope.buffController.selfBuffs,function(value,key){
			value.remain--;
			this[key] = value;
			if(value.remain<=0){
				delete this[key];
			}
			if(value.type == "buff"){
				angular.forEach(value.data,function(buffNumber,key){
					$rootScope.myself.extra[key]+=buffNumber*value.level;
				});
			}
		},$rootScope.buffController.selfBuffs);
		// dps 计算
		$rootScope.time++;
		if($rootScope.time%16===0){
			$rootScope.dps = $rootScope.globalDamage/$rootScope.time*16;
			if($rootScope.kill) $rootScope.target.curLife = $rootScope.target.life-$rootScope.globalDamage;
			if($rootScope.target.curLife<=0){
				$scope.stop();
			}
		}
	};
	var loopInterval;
	$rootScope.time = 0;
	$rootScope.debug = false;
	$rootScope.kill = true;
	$rootScope.globalDamage = 0;
	$scope.start = function(){
		$scope.clear();
		$rootScope.globalDamage = 0;
		$rootScope.time = 0;
		$rootScope.dpsLog = {
			skillList:[],
			skillDetails:[]
		};
		var b = new Date();
		$rootScope.buffController = {
			selfBuffs:{},
			targetBuffs:{}
		};
		$rootScope.skillController = {
			list:$rootScope.originalSkillList,
			curSkill:null
		};
		$rootScope.myself.states = {
			life:27166,
			mana:32000,
			ota:false,
			otaRemain:0,
			curOta:0,
			gcd:0
		};
		angular.forEach($rootScope.skillController.list,function(value,key){
			value.cdRemain = 0;
		});
		if($rootScope.debug){
			$interval.cancel(loopInterval);
			loopInterval = $interval($scope.digest,62.5);
		}else{
			for (; $rootScope.time < $rootScope.maxTime*16*60; ) {
				$scope.digest();
				if($rootScope.target.curLife<=0) break;
			}
		}
		var e = new Date();
		console.log(e.getTime()-b.getTime());
		if($rootScope.dpsLog.skillDetails[0]){
			$rootScope.curSkillStats = $rootScope.dpsLog.skillDetails[0];
			$rootScope.skillHighlight = $rootScope.dpsLog.skillDetails[0].name;
		}
		return $rootScope.dps;
	};
	$scope.aveStart = function(){
		var b = new Date();
		var totalDps = 0;
		for (var i = 0; i < 10; i++) {
			totalDps += $scope.start();
		}
		console.log("平均DPS："+totalDps/100);
		var e = new Date();
		console.log("耗时："+(e.getTime()-b.getTime())+" ms");
	};
	$scope.stop = function(){
		$interval.cancel(loopInterval);
	};
	$scope.clear = function(){
		// $('#log').html("");
		localStorage.setItem("simulator_default",JSON.stringify($rootScope.settings));
	};
	$scope.macro = function(){
		// for (var i = 0; i < $rootScope.macroProgram.length; i++) {
		// 	var success = macroTranslate($rootScope.macroProgram[i]);
		// 	if(success) break;
		// };
		eval('(function() {' + expression + '}())');
	};
	// 宏命令
	// 动作指令
	$scope.cast = function(skillName){
		var skill;
		angular.forEach($rootScope.skillController.list,function(value,key){
			if(value.name == skillName){
				skill = angular.copy($rootScope.skillController.list[key]);
			}
		});
		if(!skill) return false;
		if(skill.cdRemain>0) return false;
		skill.onSkillPrepare($rootScope.myself,$rootScope.target,$rootScope.buffController,$rootScope.skillRecipe,$rootScope.skillOption);
		// 水月免读条
		if($rootScope.originalBuffList.shuiYueBuff.id in $rootScope.buffController.selfBuffs&&skill.type=="ota"){
			skill.ota = 0;
			skill.type = "instant";
			$rootScope.buffController.selfBuffs[$rootScope.originalBuffList.shuiYueBuff.id].level--;
			if($rootScope.buffController.selfBuffs[$rootScope.originalBuffList.shuiYueBuff.id].level===0) delete $rootScope.buffController.selfBuffs[$rootScope.originalBuffList.shuiYueBuff.id];
		}
		if(skill.hasRecipes) skill.applyRecipe($rootScope.skillRecipe[skill.recipeName],$rootScope.buffController);
		if(skill.type=="ota"&&!$rootScope.myself.states.ota&&($rootScope.myself.states.gcd===0||skill.gcdCast)){
			$rootScope.myself.states.ota = true;
			$rootScope.skillController.curSkill = skill;
			$rootScope.myself.states.curOta = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,skill.ota);
			$rootScope.myself.states.otaRemain = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,skill.ota);
			$rootScope.myself.states.gcd = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,24);
		}else if(skill.type=="instant"&&!$rootScope.myself.states.ota&&($rootScope.myself.states.gcd===0||skill.gcdCast)){
			$rootScope.myself.states.ota = false;
			$rootScope.myself.states.gcd = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,24);
			var damage = skill.calc($rootScope.myself,$rootScope.target,$rootScope.buffController,$rootScope.skillRecipe,$rootScope.skillOption);
		}else if(skill.type=="channel"&&!$rootScope.myself.states.ota&&($rootScope.myself.states.gcd===0||skill.gcdCast)){
			$rootScope.myself.states.ota = true;
			$rootScope.skillController.curSkill = skill;
			$rootScope.myself.states.curOta = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,skill.interval)*(skill.ota/skill.interval);
			$rootScope.myself.states.otaRemain = $rootScope.myself.states.curOta;
			$rootScope.myself.states.curInterval = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,skill.interval);
			$rootScope.myself.states.gcd = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,24);
		}
		return true;
	};
	$scope.fcast = function(skillName){
		var skill;
		angular.forEach($rootScope.skillController.list,function(value,key){
			if(value.name == skillName){
				skill = angular.copy($rootScope.skillController.list[key]);
			}
		});
		if(!skill) return false;
		if(skill.cdRemain>0) return false;
		skill.onSkillPrepare($rootScope.myself,$rootScope.target,$rootScope.buffController,$rootScope.skillRecipe,$rootScope.skillOption);
		// 水月免读条
		if($rootScope.originalBuffList.shuiYueBuff.id in $rootScope.buffController.selfBuffs&&skill.type=="ota"){
			skill.ota = 0;
			skill.type = "instant";
			$rootScope.buffController.selfBuffs[$rootScope.originalBuffList.shuiYueBuff.id].level--;
			if($rootScope.buffController.selfBuffs[$rootScope.originalBuffList.shuiYueBuff.id].level===0) delete $rootScope.buffController.selfBuffs[$rootScope.originalBuffList.shuiYueBuff.id];
		}
		if(skill.hasRecipes) skill.applyRecipe($rootScope.skillRecipe[skill.recipeName],$rootScope.buffController);
		// 强行打出技能
		if(skill.type=="ota"&&($rootScope.myself.states.gcd===0||skill.gcdCast)){
			$rootScope.myself.states.ota = true;
			$rootScope.skillController.curSkill = skill;
			$rootScope.myself.states.curOta = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,skill.ota);
			$rootScope.myself.states.otaRemain = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,skill.ota);
			$rootScope.myself.states.gcd = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,24);
		}else if(skill.type=="instant"&&($rootScope.myself.states.gcd===0||skill.gcdCast)){
			if($rootScope.myself.states.ota&&($rootScope.skillController.curSkill.canCastSkill==skill.name||$rootScope.skillController.curSkill.name==skill.canCastSkill)){
			}else{
				$rootScope.myself.states.ota = false;
			}
			$rootScope.myself.states.gcd = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,24);
			var damage = skill.calc($rootScope.myself,$rootScope.target,$rootScope.buffController,$rootScope.skillRecipe,$rootScope.skillOption);
		}else if(skill.type=="channel"&&($rootScope.myself.states.gcd===0||skill.gcdCast)){
			$rootScope.myself.states.ota = true;
			$rootScope.skillController.curSkill = skill;
			$rootScope.myself.states.curOta = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,skill.interval)*(skill.ota/skill.interval);
			$rootScope.myself.states.otaRemain = $rootScope.myself.states.curOta;
			$rootScope.myself.states.curInterval = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,skill.interval);
			$rootScope.myself.states.gcd = Utils.hasteCalc($rootScope.myself.attributes.haste,$rootScope.myself.extra.haste,24);
		}
		return true;
	};
	// 自身条件
	$scope.buff = function(buffName,level,sign){
		// 判断自己身上是否存在某增益或减益buff
		// 或者判断自己身上的某增益或减益buff是否大于，小于或等于几层
		if(!level) level = 1;
		if(!sign) sign = "=";
		var returnValue = false;
		angular.forEach($rootScope.buffController.selfBuffs,function(value,key){
			if(value.name==buffName){
				switch(sign){
					case ">":
						if(value.level>level) returnValue = true;
						break;
					case "<":
						if(value.level<level) returnValue = true;
						break;
					case "=":
						if(value.level==level) returnValue = true;
						break;
					case "<=":
						if(value.level<=level) returnValue = true;
						break;
					case ">=":
						if(value.level>=level) returnValue = true;
						break;
				}
			}
		});
		return returnValue;
	};
	$scope.nobuff = function(buffName){
		// 判断自己身上无某增益或减益buff
		var returnValue = true;
		angular.forEach($rootScope.buffController.selfBuffs,function(value,key){
			if(value.name==buffName){
				returnValue = false;
			}
		});
		return returnValue;
	};
	$scope.bufftime = function(buffName,seconds,sign){
		// 判断自己身上某增益或减益buff 持续时间大于，小于或等于多少秒
		var returnValue = false;
		angular.forEach($rootScope.buffController.selfBuffs,function(value,key){
			if(value.name==buffName){
				var timeRemain = Math.floor(value.remain/16);
				switch(sign){
					case ">":
						if(timeRemain>seconds) returnValue = true;
						break;
					case "<":
						if(timeRemain<seconds) returnValue = true;
						break;
					case "=":
						if(timeRemain==seconds) returnValue = true;
						break;
					case "<=":
						if(timeRemain<=seconds) returnValue = true;
						break;
					case ">=":
						if(timeRemain>=seconds) returnValue = true;
						break;
				}
			}
		});
		return returnValue;
	};
	$scope.life = function(percent,sign){
		// 生命值大于，小于或等于最大血量的百分之多少
		if(sign==">"&&$rootScope.myself.states.life>percent) return true;
		if(sign=="<"&&$rootScope.myself.states.life<percent) return true;
		if(sign=="="&&$rootScope.myself.states.life==percent) return true;
		if(sign=="<="&&$rootScope.myself.states.life<=percent) return true;
		if(sign==">="&&$rootScope.myself.states.life>=percent) return true;
		return false;
	};
	$scope.mana = function(percent,sign){
		// 内力值大于，小于或等于最大血量的百分之多少
		if(sign==">"&&$rootScope.myself.states.mana>percent) return true;
		if(sign=="<"&&$rootScope.myself.states.mana<percent) return true;
		if(sign=="="&&$rootScope.myself.states.mana==percent) return true;
		if(sign=="<="&&$rootScope.myself.states.mana<=percent) return true;
		if(sign==">="&&$rootScope.myself.states.mana>=percent) return true;
		return false;
	};
	// 目标条件
	$scope.tbuff = function(buffName,level,sign){
		// 判断目标身上是否存在某增益或减益buff
		// 或者判断目标身上的某增益或减益buff是否大于，小于或等于几层
		if(!level) level = 1;
		if(!sign) sign = "=";
		var returnValue = false;
		angular.forEach($rootScope.buffController.targetBuffs,function(value,key){
			if(value.name==buffName){
				switch(sign){
					case ">":
						if(value.level>level) returnValue = true;
						break;
					case "<":
						if(value.level<level) returnValue = true;
						break;
					case "=":
						if(value.level==level) returnValue = true;
						break;
					case "<=":
						if(value.level<=level) returnValue = true;
						break;
					case ">=":
						if(value.level>=level) returnValue = true;
						break;
				}
			}
		});
		return returnValue;
	};
	$scope.tnobuff = function(buffName){
		// 判断目标身上无某增益或减益buff
		var returnValue = true;
		angular.forEach($rootScope.buffController.targetBuffs,function(value,key){
			if(value.name==buffName){
				returnValue = false;
			}
		});
		return returnValue;
	};
	$scope.tbufftime = function(buffName,seconds,sign){
		// 判断目标身上某增益或减益buff 持续时间大于，小于或等于多少秒
		var returnValue = false;
		angular.forEach($rootScope.buffController.targetBuffs,function(value,key){
			if(value.name==buffName){
				var timeRemain = Math.floor(value.remain/16);
				switch(sign){
					case ">":
						if(timeRemain>seconds) returnValue = true;
						break;
					case "<":
						if(timeRemain<seconds) returnValue = true;
						break;
					case "=":
						if(timeRemain==seconds) returnValue = true;
						break;
					case "<=":
						if(timeRemain<=seconds) returnValue = true;
						break;
					case ">=":
						if(timeRemain>=seconds) returnValue = true;
						break;
				}
			}
		});
		return returnValue;
	};
	$scope.target = function(type){
		// 目标是否为 npc 或者 玩家
		// DPS 测试器中，目标只能是NPC
		if(type=="npc"||type=="all") return true;
		else return false;
	};
	$scope.notarget = function(){
		// 目标是否存在
		// DPS 测试器中，目标只要血量高于0均存在
		if($rootScope.target.curLife>0) return false;
		else return true;
	};
	$scope.distance = function(distance,sign){
		// 离目标的距离大于，小于或等于多少尺
		// DPS 测试器中，不判定距离
		return true;
	};
	// 测试器条件
	$scope.nocd = function(skillName){
		// 判断自身技能是否没有CD
		var returnValue = true;
		angular.forEach($rootScope.skillController.list,function(value,key){
			if(value.name == skillName){
				returnValue = value.cdRemain<=0;
			}
		});
		return returnValue;
	};

	$rootScope.hotkeyList=$rootScope.settings.hotkeys;
	var hotkeyCallback = function(event, hotkey) {
		event.preventDefault();
		var skillName = hotkey.description;
		var skill;
		angular.forEach($rootScope.skillController.list,function(value,key){
			if(value.name == skillName){
				skill = angular.copy($rootScope.skillController.list[key]);
			}
		});
		if(!skill) return false;
		if(skill.type!="channel") $scope.cast(skill.name);
		else $scope.fcast(skill.name);
	};
	angular.element(document).ready(function () {
		for (var i = 0; i < $rootScope.hotkeyList.length; i++) {
			var skill = $rootScope.originalSkillList[$rootScope.settings.skillOrder[i]];
			hotkeys.add({
				combo: $rootScope.hotkeyList[i],
				description: skill.name,
				order: $rootScope.settings.skillOrder[i],
				callback: hotkeyCallback
			});
		}
	});
}]);

app.controller('StatsCtrl', ['$rootScope','$scope','DTOptionsBuilder','DTColumnDefBuilder', function($rootScope,$scope,DTOptionsBuilder, DTColumnDefBuilder){
	$scope.typeList=["hit","crit","insight","miss"];
	$scope.typeDesc={
		hit:"命中",
		crit:"会心",
		insight:"识破",
		miss:"偏离"
	};
	$scope.skillTable = {
		dtOptions:{
			"lengthChange":false,
			"searching": false,
			"order": [[ 2, 'desc' ]],
			"paging": false,
			"info": false,
			"language": {
				"emptyTable": '<span class="text-primary-dark text-caption">暂无数据</span>'
			},
			"rowCallback":function(nRow, aData, iDisplayIndex, iDisplayIndexFull){
				$('td', nRow).unbind('click');
				$('td', nRow).bind('click', function() {
					$scope.$apply(function() {
						$scope.tabSwitch(aData[0]);
					});
				});
				return nRow;
			}
		},
		dtColumnDefs:{}
	};
	$scope.detailTable = {
		dtOptions:{
			"lengthChange":false,
			"searching": false,
			"ordering": false,
			"paging": false,
			"info": false,
		},
		dtColumnDefs:{}
	};
	$scope.dtInstances = {
		skillTable:{},
		detailTable:{}
	};
	$scope.tabSwitch = function(name){
		for (var i = 0; i < $rootScope.dpsLog.skillList.length; i++) {
			if($rootScope.dpsLog.skillList[i] == name){
				$rootScope.curSkillStats = $rootScope.dpsLog.skillDetails[i];
				$rootScope.skillHighlight = name;
				break;
			}
		}
	};
}]);