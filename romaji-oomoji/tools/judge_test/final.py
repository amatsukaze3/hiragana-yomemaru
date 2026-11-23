import json, numpy as np, sys
from sklearn.neural_network import MLPClassifier
D=json.load(open('onset_feats.json'))
CL=['V','K','S','H','N','Y','W','R']
def cls(r):
    if r in ('a','i','u','e','o'): return 'V'
    return {'k':'K','t':'K','s':'S','sh':'S','ts':'S','ch':'S','h':'H','f':'H','n':'N','m':'N','y':'Y','w':'W','r':'R'}[r[:-1]]
X=np.array([d['feat'] for d in D]); y=np.array([CL.index(cls(d['f'].split('_')[1])) for d in D])
vo=np.array([d['f'][:3] for d in D])
mu=X.mean(0); sd=X.std(0)+1e-6; Z=(X-mu)/sd
alpha=float(sys.argv[1]); H=int(sys.argv[2]); R=float(sys.argv[3])
mk=lambda seed: MLPClassifier((H,),alpha=alpha,max_iter=1500,random_state=seed)
P=np.zeros((len(y),8))
for v in sorted(set(vo)):
    tr=vo!=v; te=vo==v
    P[te]=np.mean([mk(s).fit(Z[tr],y[tr]).predict_proba(Z[te]) for s in range(3)],0)
def score(P,k):
    if k==0: return P[:,0]/(P[:,0]+np.max(P[:,1:],1)+1e-9)
    return P[:,k]/(P[:,k]+P[:,0]+1e-9)
thr=[];thrS=[];thrL=[];thrF=[]
# すぐ 合格に して よい しきいち（thrFast）：子音の 目標は 母音だけの よみが 2% しか こえない ところ、あ行は 子音の よみが 3% しか こえない ところ
for k in range(8):
    sc=score(P,k)
    tf=float(np.percentile(sc[y==0],98)) if k else float(np.percentile(sc[y!=0],97))
    thrF.append(tf)
    print(f'  {CL[k]} すぐ合格 thr {tf:.3f}  正しい よみが すぐ 合格に なる 割合 {(sc[y==k]>=tf).mean():.3f}')
    thrS.append(float(np.percentile(score(P,k)[y==k],15)))
    thrL.append(float(np.percentile(score(P,k)[y==k],3)))
    s=score(P,k); t=np.percentile(s[y==k],(1-R)*100); thr.append(float(t))
    others=(y!=k)&(y!=0)
    print(f'{CL[k]} thr {t:.3f}  正しいを通す {(s[y==k]>=t).mean():.3f}  ' + (f'母音だけ通す {(s[y==0]>=t).mean():.3f}  ' if k else f'子音を通す {(s[y!=0]>=t).mean():.3f}') + (f' ちがう子音 {(score(P,k)[others]>=t).mean():.3f}' if k else ''))
if len(sys.argv)>4:
    ms=[mk(s).fit(Z,y) for s in range(3)]
    json.dump({'classes':CL,'mu':mu.round(6).tolist(),'sd':sd.round(6).tolist(),'thr':[round(t,4) for t in thr],'thrStrict':[round(t,4) for t in thrS],'thrLoose':[round(t,4) for t in thrL],'thrFast':[round(t,4) for t in thrF],
               'nets':[{'W1':m.coefs_[0].T.round(5).tolist(),'b1':m.intercepts_[0].round(5).tolist(),'W2':m.coefs_[1].T.round(5).tolist(),'b2':m.intercepts_[1].round(5).tolist()} for m in ms]},open(sys.argv[4],'w'))
    print('saved')
