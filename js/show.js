
var libName = "";

var volumeList;
var volumeIndex = 0, chapterIndex = 0, sectionIndex = 0;
var showList = new Array();
var contentPage = false, lastPagePos = 0;

var canTouch = false;
var showVolume = false, showChapter = true, showSection = true, showFloat = true;
var fontSize = 1;

var floatTime = 0;
var timeID;

var searching = false;
var searchtext = "";
var cursearchingpara = 0;
var searchinpage = true;

function initShowList()
{
	nightMode(false);
	if (night) {
		document.getElementById("ch_nightmode").checked = true;
	}
	
	var x = getXMLMain();
	if (x != null) {
		libName = x.getElementsByTagName("title")[0].childNodes[0].nodeValue;
		volumeList = x.getElementsByTagName("volume");
		
		initSettings();
		
		showLibraryInfo();
		refreshShow();
		searchList();
		
		floatTime = 0;
		timeID = setTimeout(refreshFloatTime, 1000);
		
		refreshUpDown();
	}
	else {
		document.write("很遗憾，您的浏览器不支持本知识库文件解析，无法继续！");
	}
}

function initSettings()
{
	showVolume = ((getCookie("volume") == "true") ? true : false);
	document.getElementById("ch_showvolume").checked = showVolume;
	
	showChapter = ((getCookie("chapter") == "false") ? false : true);
	document.getElementById("ch_showchapter").checked = showChapter;
	
	showSection = ((getCookie("section") == "false") ? false : true);
	document.getElementById("ch_showsection").checked = showSection;
	
	showFloat = ((getCookie("float") == "false") ? false : true);
	document.getElementById("ch_showfloat").checked = showFloat;
	if (showFloat) {
		initFloat();
		document.getElementsByClassName("ttp_float")[0].style.display = "";
	}
	else {
		document.getElementsByClassName("ttp_float")[0].style.display = "none";
	}
	
	searchinpage = ((getCookie("search") == "false") ? false : true);
}

function showLibraryInfo()
{
	document.getElementById("title").innerHTML = 
		("★" + getXMLMain().getElementsByTagName("title")[0].childNodes[0].nodeValue);
}

function findReturnCount(string)
{
	if (!string)
	{
		return 0;
	}
	
	var retString = replaceReturn(string);
	if (!retString)
	{
		return 0;
	}
	
	var returnStr = "<br />";
	
	var ret = 0, pos = retString.indexOf(returnStr);
	while(pos > -1)
	{
		ret++;
		pos = retString.indexOf(returnStr, pos + 1);
	}
	
	return ret;
}

function cutStringByReturn(string, times)
{
	if (!string || !times)
	{
		return "";
	}
	
	var retString = replaceReturn(string);
	if (!retString)
	{
		return "";
	}
	
	var newReturnStr = "<br />";
	var pos = retString.indexOf(newReturnStr);
	var findCount = 0;
	while(pos >= 0)
	{
		findCount++;
		if (findCount >= times)
		{
			break;
		}
		
		pos = retString.indexOf(newReturnStr, pos + 1);
	}
	
	if (pos >= 0)
	{
		retString = retString.substring(0, pos);
	}

	return retString;
}

function replaceReturn(string)
{
	if (!string)
	{
		return null;
	}
	
	var newReturnStr = "<br />";
	
	retString = string.replace(/\r\n/gm, newReturnStr);
	retString = retString.replace(/\r/gm, newReturnStr);
	retString = retString.replace(/\n/gm, newReturnStr);
	
	return retString;
}

function refreshShow()
{
	if (volumeIndex >= volumeList.length) {
		volumeIndex = 0;
	}
	var volumeTitle = volumeList[volumeIndex].getElementsByTagName("title")[0].childNodes[0].nodeValue;
	
	var chapterList = volumeList[volumeIndex].getElementsByTagName("chapter");
	if (chapterIndex >= chapterList.length) {
		chapterIndex = 0;
	}
	var chapterTitle = chapterList[chapterIndex].getElementsByTagName("title")[0].childNodes[0].nodeValue;
	
	var sectionList = chapterList[chapterIndex].getElementsByTagName("section");
	if (sectionIndex >= sectionList.length) {
		sectionIndex = 0;
	}
	var section = sectionList[sectionIndex];
	var sectionTitle = section.getElementsByTagName("title")[0].childNodes[0].nodeValue;
	
	var text = section.getElementsByTagName("text")[0].innerHTML;
	
	var string = "";
	if (showVolume) {
		string += "<h2 style = 'word-wrap:break-word;word-break:break-all;overflow:hidden;'>" + volumeTitle + "</h2>";
	}
	if (showChapter) {
		string += "<h3 style = 'word-wrap:break-word;word-break:break-all;overflow:hidden;'>" + chapterTitle + "</h3>";
	}
	if (showSection) {
		string += "<h4 style = 'word-wrap:break-word;word-break:break-all;overflow:hidden;'>" + sectionTitle + "</h4>";
	}
	document.getElementById("text").innerHTML = string + text;
}

function option(show)
{
	if (show) {
		showVeil(true);
		document.getElementById("contentbtn").style.display = "none";
		document.getElementsByClassName("ttp_option")[0].style.display = "";
	}
	else {
		showVeil(false);
		document.getElementById("contentbtn").style.display = "";
		document.getElementsByClassName("ttp_option")[0].style.display = "none";
	}
}

function setShow(str)
{
	switch(str)
	{
	case "night":
		nightMode(true);
		break;
		
	case "volume":
		showVolume = !showVolume;
		setCookie("volume", showVolume ? "true" : "false", 168);
		break;
		
	case "chapter":
		showChapter = !showChapter;
		setCookie("chapter", showChapter ? "true" : "false", 168);
		break;
		
	case "section":
		showSection = !showSection;
		setCookie("section", showSection ? "true" : "false", 168);
		break;
		
	case "float":
		showFloat = !showFloat;
		initFloat();
		if (showFloat) {
			document.getElementsByClassName("ttp_float")[0].style.display = "";
		}
		else {
			document.getElementsByClassName("ttp_float")[0].style.display = "none";
		}
		setCookie("float", showFloat ? "true" : "false", 168);
		break;
		
	case "search":
		searchinpage = !searchinpage;
		refreshUpDown();
		setCookie("search", searchinpage ? "true" : "false", 168);
		break;
		
	case "enlarge":
		fontSize += 0.1;
		if (fontSize >= 1.5) {
			document.getElementById("enlarge").style.display = "none";
		}
		document.getElementById("shrink").style.display = "";
		document.getElementById("text").style.fontSize = fontSize + "em";
		setCookie("fontsize", "" + fontSize, 168);
		break;
		
	case "shrink":
		fontSize -= 0.1;
		if (fontSize <= 0.8) {
			document.getElementById("shrink").style.display = "none";
		}
		document.getElementById("enlarge").style.display = "";
		document.getElementById("text").style.fontSize = fontSize + "em";
		setCookie("fontsize", "" + fontSize, 168);
		break;
	}
	
	document.getElementById("size").innerHTML = "字体大小×" + parseFloat(fontSize.toFixed(1));
	refreshShow();
}

function switchContent()
{
	contentPage = !contentPage;
	if (contentPage) {
		lastPagePos = window.pageYOffset;
		
		document.getElementById("textPage").style.display = "none";
		document.getElementById("contentPage").style.display = "";
		document.getElementsByClassName("ttp_float")[0].style.display = "none";
		document.getElementsByClassName("ttp_tail")[0].style.display = "none";
		document.getElementById("optionbtn").style.display = "none";
		
		document.getElementById("search").value = searchtext;
		searchList();
		
		var e = document.getElementById("con" + volumeIndex + "," + chapterIndex + "," + sectionIndex);
		window.scrollTo(0, e.offsetTop + e.offsetHeight - screen.availHeight * 0.5);
	}
	else {
		document.getElementById("textPage").style.display = "";
		document.getElementById("contentPage").style.display = "none";
		if (showFloat) {
			document.getElementsByClassName("ttp_float")[0].style.display = "";
			refreshFloat();
		}
		document.getElementsByClassName("ttp_tail")[0].style.display = "";
		
		document.getElementById("optionbtn").style.display = "";
		
		window.scrollTo(0, lastPagePos);
		lastPagePos = 0;
	}
	
	refreshUpDown(0);
}

function searchList()
{
	var str = document.getElementById("search").value;
	showList.splice(0, showList.length);
	
	for (var i = 0; i < volumeList.length; i++) {
		var chapterList = volumeList[i].getElementsByTagName("chapter");
		for (var j = 0; j < chapterList.length; j++) {
			var sectionList = chapterList[j].getElementsByTagName("section");
			for (var k = 0; k < sectionList.length; k++) {
				if ((str && str.length && sectionList[k].getElementsByTagName("text")[0].textContent.indexOf(str) >= 0) || !str || !str.length) {
					var s = i + "," + j + "," + k;
					showList.push(s);
				}
			}
		}
	}
	
	var html = "";
	if (!showList.length) {
		html += '<div class="ttp_volume">找不到相关内容</div>';
	}
	else {
		var curVolume = -1, curChapter = -1;
		var chapterList, sectionList;
		for (var i = 0; i < showList.length; i++) {
			var l = showList[i].split(",");
			if (parseInt(l[0]) != curVolume) {
				curVolume = parseInt(l[0]);
				curChapter = -1;
				chapterList = volumeList[curVolume].getElementsByTagName("chapter");
				
				html += '<div class="ttp_volume">' + volumeList[curVolume].getElementsByTagName("title")[0].childNodes[0].nodeValue + '</div>';
			}
			if (parseInt(l[1]) != curChapter) {
				curChapter = parseInt(l[1]);
				sectionList = chapterList[curChapter].getElementsByTagName("section");
				
				html += '<div class="ttp_chapter">' + chapterList[curChapter].getElementsByTagName("title")[0].childNodes[0].nodeValue + '</div>';
			}
			if (showList[i] == volumeIndex + "," + chapterIndex + "," + sectionIndex) {
				html += '<div class="ttp_section_sel" ';
			}
			else {
				html += '<div class="ttp_section" ';
			}
			html += 'id="con' + showList[i] + '" onclick="goTo(' + "'" + showList[i] + "')" + '">' + sectionList[parseInt(l[2])].getElementsByTagName("title")[0].childNodes[0].nodeValue;
			if (showList[i] == volumeIndex + "," + chapterIndex + "," + sectionIndex) {
				html += "<span style='font-weight:bold;'>✔</span>";
			}
			html += '</div>';
		}
	}
	document.getElementById("list").innerHTML = html;
}

function goTo(str)
{
	var s = volumeIndex + "," + chapterIndex + "," + sectionIndex;
	var l = str.split(",");
	
	volumeIndex = parseInt(l[0]);
	chapterIndex = parseInt(l[1]);
	sectionIndex = parseInt(l[2]);
	
	searchtext = document.getElementById("search").value;
	switchContent();
	refreshShow();
	
	if (s != str) {
		resetFloatTime();
	}
	
	if (searchtext && searchtext.length > 0) {
		var p = document.getElementById("text").getElementsByTagName("p");
		for (var i = 0; i < p.length; i++) {
			if (p[i].innerText.indexOf(searchtext) >= 0) {
				window.scrollTo(0, p[i].offsetTop - screen.availHeight * 0.25);
				searching = true;
				cursearchingpara = i;
				return;
			}
		}
	}
	
	searching = false;
	window.scrollTo(0, 0);
}

function pre()
{
	var chapterList, sectionList;
	
	sectionIndex--;
	if (sectionIndex < 0) {
		chapterIndex--;
		if (chapterIndex < 0) {
			volumeIndex--;
			if (volumeIndex < 0) {
				volumeIndex = chapterIndex = sectionIndex = 0;
			}
			else {
				chapterList = volumeList[volumeIndex].getElementsByTagName("chapter");
				chapterIndex = chapterList.length - 1;
				
				sectionList = chapterList[chapterIndex].getElementsByTagName("section");
				sectionIndex = sectionList.length - 1;
			}
		}
		else {
			chapterList = volumeList[volumeIndex].getElementsByTagName("chapter");
			
			sectionList = chapterList[chapterIndex].getElementsByTagName("section");
			sectionIndex = sectionList.length - 1;
		}
	}
	
	resetFloatTime();
	window.scrollTo(0, 0);
	refreshShow();
}

function next()
{
	var chapterList = volumeList[volumeIndex].getElementsByTagName("chapter");
	var sectionList = chapterList[chapterIndex].getElementsByTagName("section");
	
	sectionIndex++;
	if (sectionIndex >= sectionList.length) {
		sectionIndex = 0;
		chapterIndex++;
		if (chapterIndex >= chapterList.length) {
			chapterIndex = 0;
			volumeIndex++;
			if (volumeIndex >= volumeList.length) {
				volumeIndex = volumeList.length - 1;
				
				chapterList = volumeList[volumeIndex].getElementsByTagName("chapter");
				chapterIndex = chapterList.length - 1;
				
				sectionList = chapterList[chapterIndex].getElementsByTagName("section");
				sectionIndex = sectionList.length - 1;
			}
		}
	}
	
	resetFloatTime();
	window.scrollTo(0, 0);
	refreshShow();
}

function point(x, y)
{
	this.x = x;
	this.y = y;
}
var floatInit = false;
var floatDownOffset = new point(0, 0);
var floatDock = "right";
var floatDrag = false;

function initFloat()
{
	if (floatInit) {
		return;
	}
	
	// 首次显示时的初始化
	var head = document.getElementsByClassName("ttp_head")[0];
	var floatW = document.getElementsByClassName("ttp_float")[0];
	
	floatW.style.top = (head.offsetHeight + 10) + "px";
	floatW.style.right = "0";
	floatDock = "right";
	floatInit = true;
	
	try {
		if("ontouchstart" in window) {
			canTouch = true;
			floatW.addEventListener('touchstart', floatMouseDown, false);
			document.addEventListener('touchmove', floatMouseMove, { passive: false });
			document.addEventListener('touchend', mouseUp, false);
		}
		else {
			floatW.addEventListener("mousedown", floatMouseDown, false);
			document.addEventListener("mousemove", floatMouseMove, false);
			document.addEventListener("mouseup", mouseUp, false);
		}
	}
	catch(e) {
		floatW.attachEvent('mousedown', floatMouseDown);
		document.attachEvent("mousemove", floatMouseMove);
		document.attachEvent('mouseup', MouseUp);
	}
}

function getEventPosition(dom, e)
{
	var box = dom.getBoundingClientRect();
	
	var x1, y1;
	if (canTouch) {
		if (e.targetTouches.length) {
			x1 = e.targetTouches[0].clientX;
			y1 = e.targetTouches[0].clientY;
		}
		else {
			x1 = e.changedTouches[0].clientX;
			y1 = e.changedTouches[0].clientY;
			// 当最后一个手指离开，则滑动完毕
			touchDown = false;
		}
	}
	else {
		x1 = e.clientX;
		y1 = e.clientY;
	}
	
	return {
		x: (x1 - box.left) * (dom.offsetWidth / box.width),
		y: (y1 - box.top) * (dom.offsetHeight / box.height)
	};
}

function floatMouseDown(e)
{
	floatDrag = true;
	
	var head = document.getElementsByClassName("ttp_head")[0];
	var floatW = document.getElementsByClassName("ttp_float")[0];
	
	var p = getEventPosition(floatW, e);
	floatDownOffset.x = p.x;
	floatDownOffset.y = p.y;
}

function floatMouseMove(e)
{
	if (!floatDrag) {
		return;
	}
	
	if(window.event) {
		//IE中阻止函数器默认动作的方式
		window.event.returnValue = false;
	}
	else {
		//阻止默认浏览器动作(W3C)
		e.preventDefault();
	}
	
	var head = document.getElementsByClassName("ttp_head")[0];
	var tail = document.getElementsByClassName("ttp_tail")[0];
	var floatW = document.getElementsByClassName("ttp_float")[0];
	
	var floatV = parseInt(floatW.style.top);
	var floatH;
	if (floatDock == "right") {
		floatH = parseInt(floatW.style.right);
	}
	else {
		floatH = parseInt(floatW.style.left);
	}
	var p = getEventPosition(floatW, e);
	p.x += floatW.offsetLeft;
	p.y += floatW.offsetTop;
	
	var t = (p.y - floatDownOffset.y);
	if (t < head.offsetHeight) {
		t = head.offsetHeight;
	}
	else if (t + floatW.offsetHeight > window.innerHeight - tail.offsetHeight) {
		t = window.innerHeight - floatW.offsetHeight - tail.offsetHeight;
	}
	floatW.style.top = t + "px";
	
	if (floatDock == "right") {
		var h = document.getElementsByTagName("body")[0].clientWidth;
		var r = h - (p.x - floatDownOffset.x + floatW.offsetWidth);
		if (r < 0) {
			r = 0;
		}
		else if (r + floatW.offsetWidth > h) {
			r = h - floatW.offsetWidth;
		}
		floatW.style.right = r + "px";
		floatW.style.left = "";
	}
	else {
		var h = document.getElementsByTagName("body")[0].clientWidth;
		var l = p.x - floatDownOffset.x;
		if (l < 0) {
			l = 0;
		}
		else if (l + floatW.offsetWidth > h) {
			l = h - floatW.offsetWidth;
		}
		floatW.style.left = l + "px";
		floatW.style.right = "";
	}
}

function mouseUp(e)
{
	if (!floatDrag) {
		return;
	}
	
	var head = document.getElementsByClassName("ttp_head")[0];
	var floatW = document.getElementsByClassName("ttp_float")[0];
	var h = document.getElementsByTagName("body")[0].clientWidth;
	
	if (floatDock == "right") {
		var r = parseInt(floatW.style.right);
		if (r + floatW.offsetWidth / 2 > (h / 2)) {
			floatDock = "left";
			floatW.style.left = "0";
			floatW.style.right = "";
		}
		else {
			floatW.style.right = "0";
		}
	}
	else {
		var l = parseInt(floatW.style.left);
		if (l + floatW.offsetWidth / 2 > (h / 2)) {
			floatDock = "right";
			floatW.style.right = "0";
			floatW.style.left = "";
		}
		else {
			floatW.style.left = "0";
		}
	}
	floatDrag = false;
}

function refreshFloat()
{
	if (contentPage) {
		return;
	}
	
	var b = document.getElementsByTagName("body")[0];
	var a = window.scrollY / (b.clientHeight - window.innerHeight);
	var t = parseInt(a * 100);
	
	document.getElementById("float_pos").innerHTML = "当前位置<br/>" + t + "%";
	
	refreshUpDown();
}

function resetFloatTime()
{
	clearTimeout(timeID);
	floatTime = 0;
	document.getElementById("float_time").innerHTML = "本节学习时间<br/>" + Math.floor(floatTime / 60) + "分" + (floatTime % 60) + "秒";
	timeID = setTimeout(refreshFloatTime, 1000);
}

function refreshFloatTime()
{
	floatTime++;
	if (floatTime > 60 * 60) {
		document.getElementById("float_time").innerHTML = "本节学习时间<br/>60分钟以上";
	}
	else {
		document.getElementById("float_time").innerHTML = "本节学习时间<br/>" + Math.floor(floatTime / 60) + "分" + (floatTime % 60) + "秒";
	}
	timeID = setTimeout(refreshFloatTime, 1000);
}

function refreshUpDown()
{
	var b = document.getElementsByTagName("body")[0];
	var a = window.scrollY / (b.clientHeight - window.innerHeight);
	var down = document.getElementById("floatdown");
	var up = document.getElementById("floatup");
	
	if (!searching || contentPage || !searchinpage) {
		down.style.display = "none";
		up.style.display = "none";
	}
	else {
		if (a > 0.995) {
			down.style.display = "none";
			up.style.bottom = "4em";
		}
		else {
			down.style.display = "";
			up.style.bottom = "8em";
		}
		up.style.display = (a < 0.005) ? "none" : "";
	}
}

function quote(str)
{
	switch(str)
	{
	case "return":
		document.getElementById("quotePage").style.display = "none";
		showVeil(false);
		break;
		
	default:
		jumpTo(str);
	}
}

function jumpTo(str)
{
	var l = str.split(",");
	
	var v = parseInt(l[0]);
	var c = parseInt(l[1]);
	var s = parseInt(l[2]);
	var p = parseInt(l[3]);
	
	if (v >= volumeList.length) {
		return;
	}
	var volumeTitle = volumeList[v].getElementsByTagName("title")[0].childNodes[0].nodeValue;
	
	var chapterList = volumeList[v].getElementsByTagName("chapter");
	if (c >= chapterList.length) {
		return;
	}
	var chapterTitle = chapterList[c].getElementsByTagName("title")[0].childNodes[0].nodeValue;
	
	var sectionList = chapterList[c].getElementsByTagName("section");
	if (s >= sectionList.length) {
		return;
	}
	var section = sectionList[s];
	var sectionTitle = section.getElementsByTagName("title")[0].childNodes[0].nodeValue;
	
	var text = section.getElementsByTagName("text")[0].innerHTML;
	
	var string = "引用自：" + sectionTitle + " - " + chapterTitle + " - " + volumeTitle;
	document.getElementById("quoteTitle").innerHTML = string;
	
	// 滚动至指定位置
	var d = document.getElementById("quoteContent");
	d.innerHTML = text;
	
	showVeil(true);
	document.getElementById("quotePage").style.display = "";
	
	var pl = d.getElementsByTagName("p");
	var i;
	for (i = 0; i < pl.length; i++) {
		var a = pl[i].getAttribute("anchor");
		a = parseInt(a);
		if (a === p) {
			break;
		}
	}
	if (i == pl.length) {
		d.scrollTop = 0;
	}
	else {
		d.scrollTop = pl[i].offsetTop - d.offsetHeight * 0.25;
	}
}

function showVeil(show)
{
	if (show) {
		document.getElementById("veil").style.display = "block";
		document.getElementsByTagName("body")[0].style.overflow = "hidden";
	}
	else {
		document.getElementById("veil").style.display = "none";
		document.getElementsByTagName("body")[0].style.overflow = "";
	}
}

function findNext(d)
{
	if (!searching) {
		return;
	}
	
	var p = document.getElementById("text").getElementsByTagName("p");
	
	switch(d)
	{
	case "up":
		for (var i = p.length - 1; i >= 0; i--) {
			if (p[i].offsetTop <= window.scrollY + screen.availHeight * 0.25) {
				cursearchingpara = i;
				break;
			}
		}
		for (var i = cursearchingpara - 1; i >= 0; i--) {
			if (p[i].innerText.indexOf(searchtext) >= 0) {
				window.scrollTo(0, p[i].offsetTop - screen.availHeight * 0.25);
				cursearchingpara = i;
				return;
			}
		}
		break;
		
	case "down":
		for (var i = 0; i < p.length; i++) {
			if (p[i].offsetTop >= window.scrollY + screen.availHeight * 0.25) {
				cursearchingpara = i;
				break;
			}
		}
		for (var i = cursearchingpara + 1; i < p.length; i++) {
			if (p[i].innerText.indexOf(searchtext) >= 0) {
				window.scrollTo(0, p[i].offsetTop - screen.availHeight * 0.25);
				cursearchingpara = i;
				return;
			}
		}
		break;
	}
}