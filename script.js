// Card game logic
const DIAMOND_PATTERN = [1, 2, 3, 2, 1, 2, 3];

        class DungeonGame {
            constructor() {
                this.gameMode = null;
                this.fullDeck = [];
                this.powerDeck = [];
                this.monsterDeck = [];
                this.hand = [];
                this.clearPile = [];
                this.damagePile = [];
                this.inventory = [];
                this.dungeonLayout = [];
                this.currentMonsters = [];
                this.selectedCard = null;
                this.targetMonster = null;
                this.attackSlots = {};
                this.useReserveCard = true; // For classic mode optional rule
                
                this.init();
            }
            
            init() {
                // Set up event listeners
                document.getElementById('classicMode').addEventListener('click', () => this.setupGame('classic'));
                document.getElementById('advancedMode').addEventListener('click', () => this.setupGame('advanced'));
                document.getElementById('drawButton').addEventListener('click', () => this.drawCards());
                document.getElementById('discardButton').addEventListener('click', () => this.discardRemaining());
                document.getElementById('playAgainButton').addEventListener('click', () => this.resetGame());
                
                // Initial game status
                this.updateGameStatus("Select a game mode to begin.");
                
                // Display rules
                this.displayRules();
            }
            
            createDeck() {
                const suits = ['♥', '♦', '♠', '♣'];
                const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
                const deck = [];
                
                suits.forEach(suit => {
                    values.forEach(value => {
                        let numericValue = 0;
                        switch(value) {
                            case 'A': numericValue = 1; break;
                            case 'J': numericValue = 11; break;
                            case 'Q': numericValue = 12; break;
                            case 'K': numericValue = 13; break;
                            default: numericValue = parseInt(value);
                        }
                        
                        deck.push({
                            suit,
                            value,
                            numericValue,
                            isFaceCard: value === 'J' || value === 'Q' || value === 'K'
                        });
                    });
                });
                
                // Add Jokers
                deck.push({ suit: '★', value: 'JOKER', numericValue: 10, isJoker: true });
                deck.push({ suit: '★', value: 'JOKER', numericValue: 10, isJoker: true });
                
                return deck;
            }
            
            shuffleDeck(deck) {
                for (let i = deck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [deck[i], deck[j]] = [deck[j], deck[i]];
                }
                return deck;
            }
            
            setupGame(mode) {
                this.gameMode = mode;
                this.fullDeck = this.createDeck();
                this.clearPile = [];
                this.damagePile = [];
                this.inventory = [];
                this.hand = [];
                
                // Reset UI
                document.getElementById('dungeonArea').innerHTML = '';
                document.getElementById('handArea').innerHTML = '';
                document.getElementById('damageArea').innerHTML = '';
                document.getElementById('inventoryArea').innerHTML = '';
                
                if (mode === 'classic') {
                    this.setupClassicMode();
                } else if (mode === 'advanced') {
                    this.setupAdvancedMode();
                }
                
                // Update UI
                this.updateDeckCount();
                this.updateClearPileCount();
                this.updateGameStatus(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode started. Draw cards to begin.`);
                
                // Enable draw button
                document.getElementById('drawButton').disabled = false;
                document.getElementById('discardButton').disabled = true;
                
                // Toggle inventory visibility
                document.getElementById('inventoryContainer').style.display = 
                    mode === 'advanced' ? 'flex' : 'none';
            }
            
            setupClassicMode() {
                // Separate monster cards (face cards) from power cards
                this.monsterDeck = this.fullDeck.filter(card => card.isFaceCard);
                this.powerDeck = this.fullDeck.filter(card => !card.isFaceCard);
                
                // Shuffle both decks
                this.monsterDeck = this.shuffleDeck(this.monsterDeck);
                this.powerDeck = this.shuffleDeck(this.powerDeck);
                
                // Create dungeon layout
                const dungeonArea = document.getElementById('dungeonArea');
                dungeonArea.innerHTML = '<div class="classic-dungeon" id="classicDungeon"></div>';
                const classicDungeon = document.getElementById('classicDungeon');
                
                // Create 4 columns with 3 monster cards each
                this.dungeonLayout = [];
                for (let col = 0; col < 4; col++) {
                    const column = [];
                    for (let row = 0; row < 3; row++) {
                        const card = this.monsterDeck.pop();
                        column.push({
                            card,
                            revealed: row === 0, // Only top card is revealed
                            attackCards: []
                        });
                    }
                    this.dungeonLayout.push(column);
                }
                
                // Render dungeon
                this.renderClassicDungeon();
            }
            
            setupAdvancedMode() {
                // In advanced mode, jokers are part of the monster deck
                this.monsterDeck = this.fullDeck.filter(card => card.isFaceCard || card.isJoker);
                this.powerDeck = this.fullDeck.filter(card => !card.isFaceCard && !card.isJoker);
                
                // Shuffle both decks
                this.monsterDeck = this.shuffleDeck(this.monsterDeck);
                this.powerDeck = this.shuffleDeck(this.powerDeck);
                
                // Create diamond-shaped dungeon layout
                const dungeonArea = document.getElementById('dungeonArea');
                dungeonArea.innerHTML = '<div class="advanced-dungeon" id="advancedDungeon"></div>';
                const advancedDungeon = document.getElementById('advancedDungeon');
                
                // Create diamond pattern
                const pattern = DIAMOND_PATTERN;
                this.dungeonLayout = [];
                
                for (let rowIndex = 0; rowIndex < pattern.length; rowIndex++) {
                    const rowDiv = document.createElement('div');
                    rowDiv.className = `advanced-row ${rowIndex === pattern.length - 1 ? 'last' : ''}`;
                    advancedDungeon.appendChild(rowDiv);
                    
                    const rowCards = [];
                    for (let col = 0; col < pattern[rowIndex]; col++) {
                        const card = this.monsterDeck.pop();
                        // Only bottom row cards are revealed initially
                        const isRevealed = rowIndex === pattern.length - 1;
                        
                        rowCards.push({
                            card,
                            revealed: isRevealed,
                            attackCards: []
                        });
                        
                        // Add card to UI
                        const cardElement = this.createCardElement(card, !isRevealed);
                        cardElement.dataset.row = rowIndex;
                        cardElement.dataset.col = col;
                        
                        if (isRevealed) {
                            cardElement.addEventListener('click', (e) => this.handleMonsterClick(rowIndex, col));
                            
                            // Add attack slots for revealed cards
                            const attackSlotsDiv = document.createElement('div');
                            attackSlotsDiv.className = 'attack-slots';
                            
                            for (let i = 0; i < 3; i++) {
                                const slotDiv = document.createElement('div');
                                slotDiv.className = 'attack-slot';
                                slotDiv.textContent = i === 2 ? 'Suit' : 'Power';
                                slotDiv.dataset.slot = i;
                                slotDiv.dataset.row = rowIndex;
                                slotDiv.dataset.col = col;
                                slotDiv.addEventListener('click', (e) => this.handleAttackSlotClick(rowIndex, col, i));
                                attackSlotsDiv.appendChild(slotDiv);
                            }
                            
                            const cardContainer = document.createElement('div');
                            cardContainer.style.display = 'flex';
                            cardContainer.style.flexDirection = 'column';
                            cardContainer.style.alignItems = 'center';
                            cardContainer.appendChild(cardElement);
                            cardContainer.appendChild(attackSlotsDiv);
                            
                            rowDiv.appendChild(cardContainer);
                        } else {
                            rowDiv.appendChild(cardElement);
                        }
                    }
                    
                    this.dungeonLayout.push(rowCards);
                }
                
                // Update current monsters
                this.updateCurrentMonsters();
            }
            
            renderClassicDungeon() {
                const classicDungeon = document.getElementById('classicDungeon');
                classicDungeon.innerHTML = '';
                
                for (let col = 0; col < this.dungeonLayout.length; col++) {
                    for (let row = 0; row < this.dungeonLayout[col].length; row++) {
                        const monsterSlot = this.dungeonLayout[col][row];
                        const card = monsterSlot.card;
                        
                        if (!monsterSlot.revealed) {
                            const cardElement = this.createCardElement(card, true);
                            classicDungeon.appendChild(cardElement);
                        } else {
                            // Create container for card and attack slots
                            const cardContainer = document.createElement('div');
                            cardContainer.style.display = 'flex';
                            cardContainer.style.flexDirection = 'column';
                            cardContainer.style.alignItems = 'center';
                            
                            // Create card element
                            const cardElement = this.createCardElement(card, false);
                            cardElement.addEventListener('click', () => this.handleMonsterClick(col, row));
                            cardElement.dataset.col = col;
                            cardElement.dataset.row = row;
                            cardContainer.appendChild(cardElement);
                            
                            // Create attack slots
                            const attackSlotsDiv = document.createElement('div');
                            attackSlotsDiv.className = 'attack-slots';
                            
                            for (let i = 0; i < 3; i++) {
                                const slotDiv = document.createElement('div');
                                slotDiv.className = 'attack-slot';
                                slotDiv.textContent = i === 2 ? 'Suit' : 'Power';
                                slotDiv.dataset.slot = i;
                                slotDiv.dataset.col = col;
                                slotDiv.dataset.row = row;
                                slotDiv.addEventListener('click', () => this.handleAttackSlotClick(col, row, i));
                                attackSlotsDiv.appendChild(slotDiv);
                            }
                            
                            cardContainer.appendChild(attackSlotsDiv);
                            classicDungeon.appendChild(cardContainer);
                        }
                    }
                }
                
                // Update current monsters
                this.updateCurrentMonsters();
            }
            
            createCardElement(card, faceDown = false) {
                const cardElement = document.createElement('div');
                cardElement.className = `card ${card.isFaceCard ? 'monster-card' : 'power-card'}`;
                
                if (faceDown) {
                    cardElement.classList.add('face-down');
                } else {
                    const valueDiv = document.createElement('div');
                    valueDiv.className = 'card-value';
                    valueDiv.textContent = card.value;
                    
                    const suitDiv = document.createElement('div');
                    suitDiv.className = `card-suit ${card.suit === '♥' || card.suit === '♦' ? 'heart' : 'spade'}`;
                    suitDiv.textContent = card.suit;
                    
                    cardElement.appendChild(valueDiv);
                    cardElement.appendChild(suitDiv);
                    
                    if (card.suit === '♥' || card.suit === '♦') {
                        cardElement.classList.add(card.suit === '♥' ? 'heart' : 'diamond');
                    } else {
                        cardElement.classList.add(card.suit === '♠' ? 'spade' : 'club');
                    }
                }
                
                return cardElement;
            }
            
            updateCurrentMonsters() {
                this.currentMonsters = [];
                
                if (this.gameMode === 'classic') {
                    for (let col = 0; col < this.dungeonLayout.length; col++) {
                        for (let row = 0; row < this.dungeonLayout[col].length; row++) {
                            if (this.dungeonLayout[col][row].revealed) {
                                this.currentMonsters.push({col, row});
                                break; // Only the top monster in each column is active
                            }
                        }
                    }
                } else if (this.gameMode === 'advanced') {
                    // In advanced mode, all revealed cards are current monsters
                    for (let row = 0; row < this.dungeonLayout.length; row++) {
                        for (let col = 0; col < this.dungeonLayout[row].length; col++) {
                            if (this.dungeonLayout[row][col] && this.dungeonLayout[row][col].revealed) {
                                this.currentMonsters.push({row, col});
                            }
                        }
                    }
                }
            }
            
            drawCards() {
                // Check if there are cards to draw
                if (this.powerDeck.length === 0) {
                    this.gameOver(false, "You ran out of cards in the power deck!");
                    return;
                }
                
                // Draw three cards or all remaining cards if less than three
                const cardsToDraw = Math.min(3, this.powerDeck.length);
                for (let i = 0; i < cardsToDraw; i++) {
                    this.hand.push(this.powerDeck.pop());
                }
                
                // Enable discard button, disable draw button
                document.getElementById('drawButton').disabled = true;
                document.getElementById('discardButton').disabled = false;
                
                // Update UI
                this.renderHand();
                this.updateDeckCount();
                this.updateGameStatus("Select a card from your hand and a monster to attack.");
            }
            
            renderHand() {
                const handArea = document.getElementById('handArea');
                handArea.innerHTML = '';
                
                this.hand.forEach((card, index) => {
                    const cardElement = this.createCardElement(card);
                    cardElement.dataset.index = index;
                    cardElement.addEventListener('click', () => this.handleCardClick(index));
                    handArea.appendChild(cardElement);
                });
                
                // Add reserve card if in classic mode and option enabled
                if (this.gameMode === 'classic' && this.useReserveCard && this.damagePile.length > 0) {
                    const reserveCard = this.damagePile[this.damagePile.length - 1];
                    const reserveElement = this.createCardElement(reserveCard);
                    reserveElement.style.border = '2px solid gold';
                    reserveElement.dataset.reserve = true;
                    reserveElement.addEventListener('click', () => this.handleReserveCardClick());
                    
                    const reserveContainer = document.createElement('div');
                    reserveContainer.className = 'reserve-container';
                    reserveContainer.appendChild(reserveElement);
                    
                    const reserveLabel = document.createElement('div');
                    reserveLabel.textContent = 'Reserve';
                    reserveLabel.style.textAlign = 'center';
                    reserveContainer.appendChild(reserveLabel);
                    
                    handArea.appendChild(reserveContainer);
                }
            }
            
            handleCardClick(index) {
                // Deselect if already selected
                if (this.selectedCard === index) {
                    this.selectedCard = null;
                    this.updateGameStatus("Select a card from your hand and a monster to attack.");
                    // Remove highlight from all hand cards
                    document.querySelectorAll('#handArea .card').forEach(card => {
                        card.style.boxShadow = 'var(--card-shadow)';
                    });
                    return;
                }
                
                // Select new card
                this.selectedCard = index;
                this.updateGameStatus("Now select a monster and attack slot to place your card.");
                
                // Highlight selected card, unhighlight others
                document.querySelectorAll('#handArea .card').forEach(card => {
                    card.style.boxShadow = 'var(--card-shadow)';
                });
                
                document.querySelector(`#handArea .card[data-index="${index}"]`).style.boxShadow = '0 0 10px 5px gold';
            }
            
            handleReserveCardClick() {
                // Handle reserve card similar to normal card
                this.selectedCard = 'reserve';
                this.updateGameStatus("Now select a monster and attack slot to place your reserve card.");
                
                // Highlight selected card, unhighlight others
                document.querySelectorAll('#handArea .card').forEach(card => {
                    card.style.boxShadow = 'var(--card-shadow)';
                });
                
                document.querySelector('#handArea .card[data-reserve="true"]').style.boxShadow = '0 0 10px 5px gold';
            }
            
            handleMonsterClick(col, row) {
                // If no card is selected, just show the monster's status
                const monsterSlot = this.gameMode === 'classic' ? 
                    this.dungeonLayout[col][row] : this.dungeonLayout[row][col];
                
                const card = monsterSlot.card;
                
                // Build status message
                let message = `Selected monster: ${card.value} of ${card.suit} (Power: ${card.numericValue}).`;
                
                if (monsterSlot.attackCards.length > 0) {
                    message += ` Attack progress: ${monsterSlot.attackCards.length}/3 cards played.`;
                }
                
                this.updateGameStatus(message);
            }
            
            handleAttackSlotClick(col, row, slotIndex) {
                if (this.selectedCard === null) {
                    this.updateGameStatus("Select a card from your hand first.");
                    return;
                }
                
                // Get the monster and the selected card
                const monsterSlot = this.gameMode === 'classic' ? 
                    this.dungeonLayout[col][row] : this.dungeonLayout[row][col];
                
                let selectedCard;
                if (this.selectedCard === 'reserve') {
                    // Get the reserve card
                    selectedCard = this.damagePile.pop();
                } else {
                    // Get the card from hand
                    selectedCard = this.hand[this.selectedCard];
                }
                
                // Check if the attack is valid for this slot
                if (!this.isValidAttack(monsterSlot, selectedCard, slotIndex)) {
                    return;
                }
                
                // Apply the card to the attack slot
                monsterSlot.attackCards[slotIndex] = selectedCard;
                
                // Remove card from hand if not reserve
                if (this.selectedCard !== 'reserve') {
                    this.hand.splice(this.selectedCard, 1);
                } else {
                    // Update damage pile display
                    this.renderDamagePile();
                }
                
                // Reset selection
                this.selectedCard = null;
                
                // Update UI
                this.renderHand();
                this.updateAttackSlots(col, row, monsterSlot);
                
                // Check if monster is defeated
                if (monsterSlot.attackCards.length === 3) {
                    this.defeatMonster(col, row);
                }
                
                // Check if hand is empty to enable draw
                if (this.hand.length === 0) {
                    document.getElementById('drawButton').disabled = false;
                    document.getElementById('discardButton').disabled = true;
                }
                
                // Check if game is won
                this.checkGameStatus();
            }
            
            isValidAttack(monsterSlot, card, slotIndex) {
                const monster = monsterSlot.card;
                
                // If the monster is a joker (in advanced mode), handle differently
                if (monster.isJoker) {
                    this.updateGameStatus("Jokers found in the dungeon are automatically added to your hand!");
                    
                    // Add the joker to the hand
                    this.hand.push(monster);
                    
                    // Remove the joker from the dungeon
                    this.clearPile.push(monster);
                    
                    // Remove the monster from the layout
                    if (this.gameMode === 'classic') {
                        this.dungeonLayout[monsterSlot.col][monsterSlot.row] = null;
                        
                        // Reveal the next monster in the column if available
                        this.revealNextMonster(monsterSlot.col);
                    } else {
                        this.dungeonLayout[monsterSlot.row][monsterSlot.col] = null;
                        
                        // Check for newly revealed monsters
                        this.checkForRevealedMonsters();
                    }
                    
                    // Update UI
                    this.renderHand();
                    if (this.gameMode === 'classic') {
                        this.renderClassicDungeon();
                    }
                    
                    // Check game status
                    this.checkGameStatus();
                    
                    return false;
                }
                
                // Slot specific validation
                if (slotIndex === 0 || slotIndex === 1) {
                    // First two slots are for power
                    // Nothing specific to validate here
                } else if (slotIndex === 2) {
                    // Third slot must match the monster's suit or be a joker
                    if (card.suit !== monster.suit && !card.isJoker) {
                        this.updateGameStatus(`The third attack card must match the monster's suit (${monster.suit}).`);
                        return false;
                    }
                    
                    // Additionally, the first two slots must have enough power
                    if (monsterSlot.attackCards.length < 2) {
                        this.updateGameStatus("You must fill the first two power slots before the suit slot.");
                        return false;
                    }
                    
                    // Calculate total power
                    const totalPower = monsterSlot.attackCards.reduce((sum, card) => sum + card.numericValue, 0);
                    
                    if (totalPower < monster.numericValue) {
                        this.updateGameStatus(`Not enough power! You need at least ${monster.numericValue} (current: ${totalPower}).`);
                        return false;
                    }
                }
                
                // Check if slot is already filled
                if (monsterSlot.attackCards[slotIndex]) {
                    this.updateGameStatus("This attack slot is already filled.");
                    return false;
                }
                
                // Check sequential order (must fill slots in order)
                if (slotIndex > monsterSlot.attackCards.length) {
                    this.updateGameStatus("You must fill attack slots in order.");
                    return false;
                }
                
                return true;
            }
            
            updateAttackSlots(col, row, monsterSlot) {
                // Find all slots for this monster
                const slots = document.querySelectorAll(`.attack-slot[data-col="${col}"][data-row="${row}"]`);
                
                // Update each slot with the card that's played there
                slots.forEach((slot, i) => {
                    const card = monsterSlot.attackCards[i];
                    if (card) {
                        slot.innerHTML = '';
                        const cardClone = this.createCardElement(card);
                        cardClone.style.position = 'absolute';
                        cardClone.style.width = '100%';
                        cardClone.style.height = '100%';
                        slot.appendChild(cardClone);
                    }
                });
                
                // Update status message
                const monster = monsterSlot.card;
                let message = `Attack progress on ${monster.value} of ${monster.suit}: ${monsterSlot.attackCards.length}/3 cards played.`;
                
                if (monsterSlot.attackCards.length === 3) {
                    message += " Monster defeated!";
                } else if (monsterSlot.attackCards.length === 2) {
                    message += ` Now play a card matching the monster's suit (${monster.suit}).`;
                }
                
                this.updateGameStatus(message);
            }
            
            defeatMonster(col, row) {
                // Get the monster and its attack cards
                const monsterSlot = this.gameMode === 'classic' ? 
                    this.dungeonLayout[col][row] : this.dungeonLayout[row][col];
                
                const monster = monsterSlot.card;
                const attackCards = monsterSlot.attackCards;
                
                // Add all cards to the clear pile
                this.clearPile.push(monster, ...attackCards);
                
                // Handle king items in advanced mode
                if (this.gameMode === 'advanced' && monster.value === 'K') {
                    this.inventory.push(monster);
                    this.renderInventory();
                }
                
                // Remove the monster from the layout
                if (this.gameMode === 'classic') {
                    this.dungeonLayout[col][row] = null;
                    
                    // Reveal the next monster in the column if available
                    this.revealNextMonster(col);
                } else {
                    this.dungeonLayout[row][col] = null;
                    
                    // Check for newly revealed monsters
                    this.checkForRevealedMonsters();
                }
                
                // Update UI
                this.updateClearPileCount();
                if (this.gameMode === 'classic') {
                    this.renderClassicDungeon();
                }
                
                // Update game status
                this.updateGameStatus(`Monster defeated! ${monster.value} of ${monster.suit} has been cleared.`);
                
                // Check if game is won
                this.checkGameStatus();
            }
            
            revealNextMonster(col) {
                // Find the next unrevealed monster in this column
                for (let row = 0; row < this.dungeonLayout[col].length; row++) {
                    if (this.dungeonLayout[col][row] && !this.dungeonLayout[col][row].revealed) {
                        this.dungeonLayout[col][row].revealed = true;
                        this.dungeonLayout[col][row].attackCards = [];
                        break;
                    }
                }
                
                // Update current monsters
                this.updateCurrentMonsters();
            }
            
            checkForRevealedMonsters() {
                let needsUpdate = false;
                
                // Check each row and column
                for (let row = 0; row < this.dungeonLayout.length; row++) {
                    for (let col = 0; col < this.dungeonLayout[row].length; col++) {
                        const monsterSlot = this.dungeonLayout[row][col];
                        
                        if (monsterSlot && !monsterSlot.revealed) {
                            // Check if this monster should be revealed
                            // A card is revealed if there are no cards above it
                            
                            // For advanced mode diamond pattern
                            let isRevealed = true;
                            
                            // Check row above
                            if (row > 0) {
                                // Check cards that would cover this one
                                const prevRow = row - 1;
                                const pattern = DIAMOND_PATTERN; // Diamond pattern
                                
                                // Check if any cards in the row above block this one
                                for (let c = 0; c < this.dungeonLayout[prevRow].length; c++) {
                                    // Determine if this card in the previous row blocks our card
                                    // This logic depends on the diamond pattern and needs to be adjusted
                                    const isBlocker = 
                                        (pattern[row] === 3 && pattern[prevRow] === 2 && (col === c || col === c + 1)) ||
                                        (pattern[row] === 2 && pattern[prevRow] === 1 && col === c) ||
                                        (pattern[row] === 2 && pattern[prevRow] === 3 && (c === col || c === col + 1));
                                    
                                    if (isBlocker && this.dungeonLayout[prevRow][c]) {
                                        isRevealed = false;
                                        break;
                                    }
                                }
                            }
                            
                            if (isRevealed) {
                                monsterSlot.revealed = true;
                                monsterSlot.attackCards = [];
                                needsUpdate = true;
                                
                                // Handle jokers in advanced mode - automatically add to hand
                                if (monsterSlot.card.isJoker) {
                                    this.hand.push(monsterSlot.card);
                                    this.dungeonLayout[row][col] = null;
                                    this.updateGameStatus("Joker found! It's been added to your hand.");
                                    this.renderHand();
                                }
                            }
                        }
                    }
                }
                
                if (needsUpdate) {
                    // Re-render the dungeon
                    const advancedDungeon = document.getElementById('advancedDungeon');
                    advancedDungeon.innerHTML = '';
                    
                    // Recreate the diamond pattern
                    const pattern = DIAMOND_PATTERN;
                    
                    for (let rowIndex = 0; rowIndex < pattern.length; rowIndex++) {
                        const rowDiv = document.createElement('div');
                        rowDiv.className = `advanced-row ${rowIndex === pattern.length - 1 ? 'last' : ''}`;
                        advancedDungeon.appendChild(rowDiv);
                        
                        for (let col = 0; col < pattern[rowIndex]; col++) {
                            const monsterSlot = this.dungeonLayout[rowIndex][col];
                            
                            if (!monsterSlot) {
                                // Empty slot, add a placeholder
                                const placeholder = document.createElement('div');
                                placeholder.style.width = 'var(--card-width)';
                                placeholder.style.height = 'var(--card-height)';
                                placeholder.style.opacity = '0.2';
                                rowDiv.appendChild(placeholder);
                                continue;
                            }
                            
                            const card = monsterSlot.card;
                            const isRevealed = monsterSlot.revealed;
                            
                            const cardElement = this.createCardElement(card, !isRevealed);
                            cardElement.dataset.row = rowIndex;
                            cardElement.dataset.col = col;
                            
                            if (isRevealed) {
                                cardElement.addEventListener('click', () => this.handleMonsterClick(rowIndex, col));
                                
                                // Add attack slots for revealed cards
                                const attackSlotsDiv = document.createElement('div');
                                attackSlotsDiv.className = 'attack-slots';
                                
                                for (let i = 0; i < 3; i++) {
                                    const slotDiv = document.createElement('div');
                                    slotDiv.className = 'attack-slot';
                                    slotDiv.textContent = i === 2 ? 'Suit' : 'Power';
                                    slotDiv.dataset.slot = i;
                                    slotDiv.dataset.row = rowIndex;
                                    slotDiv.dataset.col = col;
                                    slotDiv.addEventListener('click', () => this.handleAttackSlotClick(rowIndex, col, i));
                                    
                                    // If slot has a card, render it
                                    if (monsterSlot.attackCards[i]) {
                                        slotDiv.innerHTML = '';
                                        const cardClone = this.createCardElement(monsterSlot.attackCards[i]);
                                        cardClone.style.position = 'absolute';
                                        cardClone.style.width = '100%';
                                        cardClone.style.height = '100%';
                                        slotDiv.appendChild(cardClone);
                                    }
                                    
                                    attackSlotsDiv.appendChild(slotDiv);
                                }
                                
                                const cardContainer = document.createElement('div');
                                cardContainer.style.display = 'flex';
                                cardContainer.style.flexDirection = 'column';
                                cardContainer.style.alignItems = 'center';
                                cardContainer.appendChild(cardElement);
                                cardContainer.appendChild(attackSlotsDiv);
                                
                                rowDiv.appendChild(cardContainer);
                            } else {
                                rowDiv.appendChild(cardElement);
                            }
                        }
                    }
                    
                    // Update current monsters
                    this.updateCurrentMonsters();
                }
            }
            
            discardRemaining() {
                // Add all remaining cards in hand to damage pile
                this.damagePile.push(...this.hand);
                this.hand = [];
                
                // Update UI
                this.renderHand();
                this.renderDamagePile();
                
                // Enable draw button, disable discard button
                document.getElementById('drawButton').disabled = false;
                document.getElementById('discardButton').disabled = true;
                
                // Check if game is lost due to damage
                if (this.gameMode === 'classic' && this.damagePile.length >= 7) {
                    this.gameOver(false, "You've taken too much damage! Game over.");
                } else if (this.gameMode === 'advanced' && this.damagePile.length >= 5) {
                    this.gameOver(false, "You've taken 5 hits! Game over.");
                } else {
                    let message = "Cards discarded. ";
                    if (this.gameMode === 'classic') {
                        message += `Damage: ${this.damagePile.length}/7`;
                    } else {
                        message += `Hits: ${this.damagePile.length}/5`;
                    }
                    
                    this.updateGameStatus(message);
                }
            }
            
            renderDamagePile() {
                const damageArea = document.getElementById('damageArea');
                damageArea.innerHTML = '';
                
                this.damagePile.forEach((card, index) => {
                    // Only show the top card if classic mode, otherwise show all cards
                    if (this.gameMode === 'advanced' || index === this.damagePile.length - 1) {
                        const cardElement = this.createCardElement(card);
                        damageArea.appendChild(cardElement);
                    }
                });
                
                // In classic mode, show damage count
                if (this.gameMode === 'classic') {
                    const countElement = document.createElement('div');
                    countElement.textContent = `${this.damagePile.length}/7`;
                    countElement.style.fontWeight = 'bold';
                    damageArea.appendChild(countElement);
                }
            }
            
            renderInventory() {
                const inventoryArea = document.getElementById('inventoryArea');
                inventoryArea.innerHTML = '';
                
                this.inventory.forEach(card => {
                    const cardElement = this.createCardElement(card);
                    
                    // Add click event for king abilities
                    cardElement.addEventListener('click', () => this.useKingAbility(card));
                    
                    const itemContainer = document.createElement('div');
                    itemContainer.className = 'item-container';
                    itemContainer.appendChild(cardElement);
                    
                    const itemDesc = document.createElement('div');
                    itemDesc.style.textAlign = 'center';
                    itemDesc.style.fontSize = '12px';
                    itemDesc.style.marginTop = '5px';
                    
                    // Add description based on king suit
                    switch(card.suit) {
                        case '♥': itemDesc.textContent = "Place card at bottom of deck"; break;
                        case '♦': itemDesc.textContent = "Look at bottom card"; break;
                        case '♠': itemDesc.textContent = "Double a card's value"; break;
                        case '♣': itemDesc.textContent = "Draw a card"; break;
                    }
                    
                    itemContainer.appendChild(itemDesc);
                    inventoryArea.appendChild(itemContainer);
                });
            }
            
            useKingAbility(king) {
                // Check if king has been used already
                if (king.used) {
                    this.updateGameStatus("This item has already been used.");
                    return;
                }
                
                // Apply ability based on king suit
                switch(king.suit) {
                    case '♥': // Place one card from hand at bottom of power deck
                        if (this.hand.length === 0) {
                            this.updateGameStatus("You have no cards in hand to place at the bottom of the deck.");
                            return;
                        }
                        
                        // Mark king as used
                        king.used = true;
                        
                        // Ask player which card to place at bottom
                        this.updateGameStatus("Select a card from your hand to place at the bottom of the power deck.");
                        
                        // Highlight hand cards and add special click event
                        document.querySelectorAll('#handArea .card').forEach((cardEl, index) => {
                            const originalClick = cardEl.onclick;
                            cardEl.onclick = () => {
                                // Move card to bottom of deck
                                const card = this.hand.splice(index, 1)[0];
                                this.powerDeck.unshift(card);
                                
                                // Update UI
                                this.renderHand();
                                this.updateDeckCount();
                                this.renderInventory();
                                
                                // Remove special click handlers
                                this.resetHandClickEvents();
                                
                                this.updateGameStatus(`Card placed at the bottom of the power deck. ${king.value} of ${king.suit} has been used.`);
                            };
                        });
                        break;
                        
                    case '♦': // Look at bottom card, move to top if desired
                        if (this.powerDeck.length === 0) {
                            this.updateGameStatus("There are no cards left in the power deck.");
                            return;
                        }
                        
                        // Mark king as used
                        king.used = true;
                        
                        // Show the bottom card
                        const bottomCard = this.powerDeck[0];
                        
                        // Create a modal to show the card
                        const modal = document.getElementById('gameModal');
                        const modalTitle = document.getElementById('modalTitle');
                        const modalMessage = document.getElementById('modalMessage');
                        const playAgainButton = document.getElementById('playAgainButton');
                        
                        modalTitle.textContent = "Bottom Card of Deck";
                        modalMessage.innerHTML = `
                            <div style="display: flex; justify-content: center; margin-bottom: 15px;">
                                <div style="display: flex; flex-direction: column; align-items: center;">
                                    <div class="card" style="width: var(--card-width); height: var(--card-height);">
                                        <div class="card-value">${bottomCard.value}</div>
                                        <div class="card-suit ${bottomCard.suit === '♥' || bottomCard.suit === '♦' ? 'heart' : 'spade'}">${bottomCard.suit}</div>
                                    </div>
                                </div>
                            </div>
                            <p>Would you like to move this card to the top of the deck?</p>
                        `;
                        
                        playAgainButton.textContent = "No, Keep at Bottom";
                        
                        // Add a "Move to Top" button
                        const moveToTopBtn = document.createElement('button');
                        moveToTopBtn.textContent = "Yes, Move to Top";
                        moveToTopBtn.style.marginLeft = "10px";
                        moveToTopBtn.onclick = () => {
                            // Move bottom card to top
                            const card = this.powerDeck.shift();
                            this.powerDeck.push(card);
                            
                            modal.style.display = "none";
                            this.renderInventory();
                            this.updateGameStatus(`Card moved to the top of the power deck. ${king.value} of ${king.suit} has been used.`);
                        };
                        
                        playAgainButton.onclick = () => {
                            modal.style.display = "none";
                            this.renderInventory();
                            this.updateGameStatus(`You kept the card at the bottom of the deck. ${king.value} of ${king.suit} has been used.`);
                        };
                        
                        modalMessage.parentNode.insertBefore(moveToTopBtn, playAgainButton.nextSibling);
                        
                        modal.style.display = "flex";
                        break;
                        
                    case '♠': // Double the value of an attack card
                        if (this.hand.length === 0) {
                            this.updateGameStatus("You have no cards in hand to double.");
                            return;
                        }
                        
                        // Mark king as used
                        king.used = true;
                        
                        // Ask player which card to double
                        this.updateGameStatus("Select a card from your hand to double its power value.");
                        
                        // Highlight hand cards and add special click event
                        document.querySelectorAll('#handArea .card').forEach((cardEl, index) => {
                            const originalClick = cardEl.onclick;
                            cardEl.onclick = () => {
                                // Double the card's value
                                this.hand[index].doubledValue = this.hand[index].numericValue * 2;
                                
                                // Update UI
                                this.renderHand();
                                this.renderInventory();
                                
                                // Remove special click handlers
                                this.resetHandClickEvents();
                                
                                this.updateGameStatus(`Card's power doubled to ${this.hand[index].doubledValue}. ${king.value} of ${king.suit} has been used.`);
                            };
                        });
                        break;
                        
                    case '♣': // Immediately draw a card
                        if (this.powerDeck.length === 0) {
                            this.updateGameStatus("There are no cards left in the power deck to draw.");
                            return;
                        }
                        
                        // Mark king as used
                        king.used = true;
                        
                        // Draw a card
                        this.hand.push(this.powerDeck.pop());
                        
                        // Update UI
                        this.renderHand();
                        this.updateDeckCount();
                        this.renderInventory();
                        
                        this.updateGameStatus(`You drew an extra card. ${king.value} of ${king.suit} has been used.`);
                        break;
                }
            }
            
            resetHandClickEvents() {
                // Reset click events on hand cards
                document.querySelectorAll('#handArea .card').forEach((cardEl, index) => {
                    cardEl.onclick = () => this.handleCardClick(index);
                });
            }
            
            checkGameStatus() {
                // Count remaining monsters
                let monstersRemaining = 0;
                
                if (this.gameMode === 'classic') {
                    for (let col = 0; col < this.dungeonLayout.length; col++) {
                        for (let row = 0; row < this.dungeonLayout[col].length; row++) {
                            if (this.dungeonLayout[col][row]) {
                                monstersRemaining++;
                            }
                        }
                    }
                } else {
                    for (let row = 0; row < this.dungeonLayout.length; row++) {
                        for (let col = 0; col < this.dungeonLayout[row].length; col++) {
                            if (this.dungeonLayout[row][col]) {
                                monstersRemaining++;
                            }
                        }
                    }
                }
                
                // Check if all monsters are defeated
                if (monstersRemaining === 0) {
                    this.gameOver(true, "Congratulations! You've cleared the dungeon!");
                    return;
                }
                
                // Check if game is lost due to damage
                if (this.gameMode === 'classic' && this.damagePile.length >= 7) {
                    this.gameOver(false, "You've taken too much damage! Game over.");
                } else if (this.gameMode === 'advanced' && this.damagePile.length >= 5) {
                    this.gameOver(false, "You've taken 5 hits! Game over.");
                }
            }
            
            gameOver(isWin, message) {
                // Show game over modal
                const modal = document.getElementById('gameModal');
                const modalTitle = document.getElementById('modalTitle');
                const modalMessage = document.getElementById('modalMessage');
                
                modalTitle.textContent = isWin ? "Victory!" : "Game Over";
                modalMessage.textContent = message;
                
                if (isWin) {
                    // Calculate score for classic mode
                    if (this.gameMode === 'classic') {
                        const score = this.powerDeck.length;
                        modalMessage.textContent += ` Your score: ${score} cards remaining.`;
                    }
                }
                
                modal.style.display = "flex";
                
                // Disable game buttons
                document.getElementById('drawButton').disabled = true;
                document.getElementById('discardButton').disabled = true;
            }
            
            resetGame() {
                // Hide modal
                document.getElementById('gameModal').style.display = "none";
                
                // Reset game state
                this.setupGame(this.gameMode);
            }
            
            updateDeckCount() {
                document.getElementById('deckCount').textContent = `Cards: ${this.powerDeck.length}`;
            }
            
            updateClearPileCount() {
                document.getElementById('clearCount').textContent = `Cards: ${this.clearPile.length}`;
            }
            
            updateGameStatus(message) {
                document.getElementById('gameStatus').textContent = message;
            }
            
            displayRules() {
                const rulesDiv = document.getElementById('gameRules');
                rulesDiv.innerHTML = `
                    <h3>Quick Rules</h3>
                    <p><strong>Objective:</strong> Defeat all monsters in the dungeon.</p>
                    <p><strong>Attack:</strong> Use 3 cards to defeat a monster:</p>
                    <ul>
                        <li>First 2 cards: Must sum to at least the monster's power (J=11, Q=12, K=13)</li>
                        <li>Third card: Must match the monster's suit</li>
                    </ul>
                    <p><strong>Jokers:</strong> Worth 10 power and can be any suit</p>
                    <p><strong>Game Ends:</strong> Win by defeating all monsters. Lose if your damage pile reaches the limit (7 cards in Classic, 5 hits in Advanced).</p>
                `;
            }
        }
        
        // Initialize the game
        const game = new DungeonGame();