const strBaseUrl = 'http://localhost:8000/'

// View the Blockchain 
document.querySelector('#btnViewChain').addEventListener('click', () => {
    fetch(strBaseUrl + 'chain')
    .then(result => {
        if(result.ok){
            return result.json()
        } else {
            throw new Error(result.status)
        }
    })
    .then(data => {
        let arrChain = data.chain
        
        // Emptying the table so we dont get duplicates when we refresh
        document.querySelector('#tblChain tbody').innerHTML = ''
        
        //
        arrChain.forEach(objBlock => {
            let strSender = 'Genesis'
            let strRecipient = 'Genesis'
            let decAmount = 0

            // If its not the genesis block we get the transaction data
            if(objBlock.blockIndex > 0) {
                strSender = objBlock.transaction.strTransSender
                strRecipient = objBlock.transaction.strTransRecipient
                decAmount = objBlock.transaction.decTransAmt
            }

            document.querySelector('#tblChain tbody').innerHTML += `<tr><td>${objBlock.blockIndex}</td><td>${objBlock.time}</td><td>${strSender}</td><td>${strRecipient}</td><td>$${decAmount}</td><td>${objBlock.hash}</td></tr>`
        })
    })
    .catch(error => {
        console.error(error)
        Swal.fire({
            title: "Error",
            icon: "error",
            text: "Couldnt load the blockchain."
        })
    })
})

// Mining a block
document.querySelector('#btnMineBlock').addEventListener('click', () => {
    let decAmount = document.querySelector('#txtTransAmount').value.trim()
    let strSender = document.querySelector('#txtTransSender').value.trim()
    let strRecipient = document.querySelector('#txtTransRecipient').value.trim()

    let blnError = false

    if(!decAmount || !strSender || !strRecipient){
        blnError = true
    }

    if(blnError == false) {
        fetch(strBaseUrl + 'transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: 
                JSON.stringify({amount: decAmount, sender: strSender, recipient: strRecipient})
        })
        .then(result => {
            if(result.ok || result.status == 201){
                return result.json()
            } else {
                throw new Error(result.status)
            }
        })
        .then(data => {
            if(data.outcome == "success"){
                Swal.fire({
                    title: "Success",
                    text: "Block Mined Successfully",
                    icon: "success",
                    timer: 1500
                })
                
                // Clearing the boxes so they are empty for the next one
                document.querySelector('#txtTransAmount').value = ''
                document.querySelector('#txtTransSender').value = ''
                document.querySelector('#txtTransRecipient').value = ''
            } else {
                Swal.fire({
                    title: "Something went wrong",
                    icon: "error",
                    text: data.message
                })
            }
        })
        .catch(error => {
            Swal.fire({
                title: "Error",
                icon: "error",
                text: "Couldnt mine the block."
            })
        })
    } else {
        Swal.fire({
            title: "Empty Fields",
            icon: "error",
            text: "You have to fill out the transaction fields."
        })
    }
})