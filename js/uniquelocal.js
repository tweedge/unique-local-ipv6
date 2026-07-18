document.getElementById("generate-button").addEventListener("click", generate);

function random_block(bits, leading_zeroes)
{
    var block = Math.floor(Math.random()*Math.pow(2,bits)).toString(16); 
    if (!leading_zeroes || block.length == bits/4)
    {
        return block;
    }
    block = '0000'.substring(0, bits/4 - block.length) + block;
    return block;
}

function random_ipv6()
{
    var prefix = Array(
    'fd' + random_block(8, true),
    random_block(16, true),
    random_block(16, true)).join(':');
    return prefix;
}

function generate()
{
    var prefix = random_ipv6();

    var prefixElems = document.getElementsByClassName('prefix');
    [].forEach.call(prefixElems, function(el) {
        el.innerText = prefix + '::/48'
    });

    var sub1st = document.getElementById('sub-1st');
    if (sub1st) {
        sub1st.innerText = prefix + '::/64';
    }

    var subLast = document.getElementById('sub-last');
    if (subLast) {
        subLast.innerText = prefix + ':ffff::/64';
    }
}

generate();
