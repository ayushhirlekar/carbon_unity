const { supabaseAdmin } = require('../config/supabase');
const { ask } = require('../agents/graph');
const { hasKey } = require('../agents/narrator');

/** POST /api/agent/chat */
const chat = async (req, res) => {
  try {
    const { farmId, question, conversationId, language } = req.body;
    if (!farmId) return res.status(400).json({ success: false, message: 'Choose a plot first' });

    const { data: farm } = await supabaseAdmin
      .from('farms').select('farmer_wallet').eq('farm_id', farmId).maybeSingle();
    if (!farm) return res.status(404).json({ success: false, message: 'Plot not found' });
    if (req.user.role !== 'admin' && farm.farmer_wallet !== req.user.walletAddress) {
      return res.status(403).json({ success: false, message: 'This is not your plot' });
    }

    let convId = conversationId;
    if (!convId) {
      const { data: conv } = await supabaseAdmin
        .from('agent_conversations')
        .insert([{
          wallet_address: req.user.walletAddress,
          farm_id: farmId,
          language: language || 'en',
          title: (question || 'Field question').slice(0, 80),
        }])
        .select().single();
      convId = conv?.conversation_id;
    }

    if (convId) {
      await supabaseAdmin.from('agent_messages').insert([
        { conversation_id: convId, role: 'user', content: question || '' },
      ]);
    }

    const result = await ask({ farmId, question, language: language || 'en' });

    if (convId) {
      await supabaseAdmin.from('agent_messages').insert([{
        conversation_id: convId,
        role: 'assistant',
        content: result.answer,
        assessment: result.facts?.assessment || null,
        guard_status: result.guardStatus,
        agents_used: result.agentsUsed,
      }]);
      await supabaseAdmin.from('agent_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('conversation_id', convId);
    }

    return res.status(200).json({
      success: true,
      data: {
        conversationId: convId,
        answer: result.answer,
        // Surfaced rather than hidden: a template fallback is
        // indistinguishable from a good answer unless it says so.
        guardStatus: result.guardStatus,
        agentsUsed: result.agentsUsed,
        assessment: result.facts?.assessment || null,
        facts: result.facts,
        modelAvailable: hasKey(),
      },
    });
  } catch (error) {
    console.error('agent chat error:', error);
    return res.status(500).json({ success: false, message: 'Could not answer that' });
  }
};

/** GET /api/agent/conversations/:farmId */
const history = async (req, res) => {
  try {
    const { data: convs } = await supabaseAdmin
      .from('agent_conversations')
      .select('*, agent_messages(*)')
      .eq('wallet_address', req.user.walletAddress)
      .eq('farm_id', req.params.farmId)
      .order('updated_at', { ascending: false })
      .limit(10);
    return res.status(200).json({ success: true, data: convs || [] });
  } catch (error) {
    console.error('agent history error:', error);
    return res.status(500).json({ success: false, message: 'Could not load history' });
  }
};

module.exports = { chat, history };
