
import sha256 from "sha256"

import express from 'express'

import sqlite3 from 'sqlite3'

sqlite3.verbose()

const HTTP_PORT = 8000

var app = express()
app.use(express.json())

// Used this to prevent cors issues
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin','*')
    res.header('Access-Control-Allow-Methods','GET, POST, PUT, DELETE')
    res.header('Access-Control-Allow-Headers','Origin, X-Requested-With,Content-Type, Accept')
    next()
})

// Connecting to the database
const cryptodb = new sqlite3.Database('crypto.db', (err) => {
    if(err){
        console.error("Error opening database:", err.message)
    } else {
        console.log("Connected to crypto.db")
        
        // Getting the first block
        const strCheckQuery = "SELECT * FROM tblBlocks WHERE blockIndex = 0"

        cryptodb.get(strCheckQuery, (err, row) => {
            if (err) {
                console.error("Database error:", err.message)
            }

            // If their are no blocks in the first index we create the genesis block
            if (!row) {
                console.log("No genesis block. Creating it now")

                const datInitTime = Date.now()
                const objEmptyTransaction = {}

                const strInsertGenesis = "INSERT INTO tblBlocks VALUES (?,?,?,?,?,?)"

                cryptodb.run(strInsertGenesis, [0, datInitTime, JSON.stringify(objEmptyTransaction), 0, "000hash", "000prevhash"], (err) => {
                    if (err) {
                        console.error("Couldnt insert the genesis block:", err.message)
                    } else {
                        console.log("Genesis block created")
                    }
                })
            }
        })
    }
})

const objHippoChain ={
    chain: [
        // the genesis block
        {
            index:0,
            time:Date.now(),
            transaction:{},
            // this shows our work (number of times we had to loop to get a hash that starts with 000)
            nonce:0,
            hash:"000hash",
            previousHash:"000prevhash"
        },
    ],
    getLastBlock: () => {
            // returns the last block in the block chain
            // by getting the total length of the array and
            // subtracting 1 to get the index of the last
            // one
            return objHippoChain.chain[objHippoChain.chain.length - 1]
        },

    generateHash: (strPreviousHash,datStartTime,objNewTransaction) => {
        let strLocalHash = '';
        let intNonce = 0;
        // This line is important, it is what makes sure
        // that we match the first 3 characters as a 000
        while(strLocalHash.substring(0,3) != '000'){
            intNonce++
            // note the previous hash as well
            // as the current date time in this 
            strLocalHash = sha256(`${strPreviousHash}${datStartTime}${JSON.stringify(objNewTransaction)}${intNonce}`)
        }
        return {strLocalHash,intNonce}
    },

    createNewBlock:(decTransAmt,strTransSender,strTransRecipient, res)=>{
        const strQuery = "SELECT * FROM tblBlocks"
        // Getting the last block's hash
        cryptodb.all(strQuery, (err, rows) => {
            if (err) {
                return res.status(500).json({outcome: "error", message: "Database error."})
            }

            // Getting the previous block
            const objPreviousBlock = rows[rows.length - 1]
            const datInitTime = Date.now()

            const objNewTransaction = {
                decTransAmt: decTransAmt,
                strTransSender: strTransSender,
                strTransRecipient: strTransRecipient
            }

            const newCoinHash = objHippoChain.generateHash(objPreviousBlock.hash, datInitTime, objNewTransaction)

            const strCollisionQuery = "SELECT hash FROM tblBlocks WHERE hash = ?"
            // Checking for collisions
            cryptodb.get(strCollisionQuery, [newCoinHash.strLocalHash], (err, row) => {
                if (row) {
                    return res.status(400).json({outcome: "error", message: "Hash collision detected."})
                }

                // Saving to sqlite
                const strInsertQuery = "INSERT INTO tblBlocks VALUES (?,?,?,?,?,?)"
                cryptodb.run(strInsertQuery, [objPreviousBlock.blockIndex + 1, datInitTime, JSON.stringify(objNewTransaction), newCoinHash.intNonce, newCoinHash.strLocalHash, objPreviousBlock.hash], (err) => {
                    if(err) {
                        return res.status(500).json({outcome: "error", message: "Couldnt save the block."})
                    } else {
                        res.status(201).json({outcome: "success", message: "Block was mined and has been saved to the database."})
                    }
                })
            })
        })
    },

    printChain: () => {
        // this is used as an easy way to see the chain in the console
        console.log(objHippoChain.chain)
    }
}

app.get("/chain", (req, res) => {
    const strQuery = "SELECT * FROM tblBlocks"
    
    cryptodb.all(strQuery, [], (err, rows) => {
        if(err) {
            return res.status(500).json({outcome: "error", message: err.message})
        } else {
            let formattedChain = []
         
            // Formatting the database's rows and converting the transaction back into an object
            rows.forEach(row => {formattedChain.push({blockIndex: row.blockIndex, time: row.time, transaction: JSON.parse(row.transaction), nonce: row.nonce, hash: row.hash, previousHash: row.previousHash})})

            res.status(200).json({outcome: "success", chain: formattedChain})
        }
    })
})

app.post("/transfer", (req, res) => {
    let decAmount = req.body.amount
    let strSender = req.body.sender
    let strRecipient = req.body.recipient

    if (!decAmount || !strSender || !strRecipient) {
        return res.status(400).json({ outcome: "error", message: "Missing transaction details." })
    }
    objHippoChain.createNewBlock(decAmount, strSender, strRecipient, res)
})

// exports an ES Module to make it available for other files

app.listen(HTTP_PORT, () =>{
    console.log('Listening on port', HTTP_PORT)
})

export {objHippoChain};