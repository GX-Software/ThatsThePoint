
var ie = (!+[1,]) ? true : false;

function getXMLMain()
{
	return self.parent.frames["global"].xmlMain;
}

function setCookie(c_name, value, expirehours)
{
	if (!navigator.cookieEnabled)
	{
		return;
	}
	
	var exdate = new Date();
	exdate.setTime(exdate.getTime() + expirehours * 60 * 60 * 1000);
	document.cookie = c_name + "=" + escape(value) + ((!expirehours) ? "" : (";expires=" + exdate.toGMTString())) + ";path=/";
}

function getCookie(name)
{
	var arr, reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
	if(arr = document.cookie.match(reg))
	{
		return unescape(arr[2]);
	}
	else
	{
		return null;
	}
}

function delCookie(name)
{
	var exp = new Date();
	exp.setTime(exp.getTime() - 1);
	var cval = getCookie(name);
	if(cval)
	{
		document.cookie = name + "=" + cval + ";expires=" + exp.toGMTString() + ";path=/";
	}
}

function getIndex(list, item)
{
	for (var i = 0; i < list.length; i++)
	{
		if (item == list[i])
		{
			return i;
		}
	}
	
	return 0;
}

function setTableInnerHTML(table, html)
{
	if (ie) {
		var temp = table.ownerDocument.createElement('div');
		temp.innerHTML = '<table><tbody>' + html + '</tbody></table>';
		if (table.tBodies.length == 0) {
			var tbody = document.createElement("tbody");
			table.appendChild(tbody);
		}
		table.replaceChild(temp.firstChild.firstChild, table.tBodies[0]);
	}
	else {
		table.innerHTML = html;
	}
}